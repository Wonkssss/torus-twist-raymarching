async function readShader(id){
    const req = await fetch(document.getElementById(id).src);
    return await req.text();
}

function createShader(gl, type, src) {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);

    let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if(success) return shader;

    console.error("Could not compile WebGL shader", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function createProgram(gl, vertShader, fragShader) { //  A program object is a container for the shaders
    let program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program); // Linking is the process of combining the vertex and fragment shaders into a single executable program

    let success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) return program;

    console.error("Could not Link WebGL program", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

let mousePosition = [0, 0] // Store mouse position in normalized coordinated

// Mouse click event listener
// canvas.addEventListener('mousemove', (event) => {
//     const rect = canvas.getBoundingClientRect();
//     mousePosition = [
//         (event.clientX - rect.left) / rect.width * 2 - 1,  // Normalize to [-1, 1] range
//         -((event.clientY - rect.top) / rect.height * 2 - 1) // Normalize to [-1, 1] range
//     ];
// });

async function main(){
    const fps = document.getElementById("fps");

    const time = {
        current_t: Date.now(),
        dts: [1 / 60],
        t: 0,
    
        dt: () => time.dts[0],
        update: () => {
          const new_t = Date.now();
          time.dts = [(new_t - time.current_t) / 1_000, ...time.dts].slice(0, 10);
          time.t += time.dt();
          time.current_t = new_t;
    
          const dt = time.dts.reduce((a, dt) => a + dt, 0) / time.dts.length;
          fps.innerHTML = `${Math.round(1 / dt, 2)}`;
        },
    };

    const canvas = document.getElementById("canvas");
    const gl = canvas.getContext("webgl2");
    if(!gl) alert ("Could not initialize WebGL Context.");

    const vertShader = createShader(gl, gl.VERTEX_SHADER, await readShader("vert"));
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, await readShader("frag"));
    const program = createProgram(gl, vertShader, fragShader);

    const a_position = gl.getAttribLocation(program, "a_position");
    const a_uv = gl.getAttribLocation(program, "a_uv");

    const u_resolution = gl.getUniformLocation(program, "u_resolution");
    const u_time = gl.getUniformLocation(program, "u_time");
    const u_dt = gl.getUniformLocation(program, "u_dt");
    const u_mouse = gl.getUniformLocation(program, "u_mouse"); // New uniform for mouse position
    
    // Place this below `const canvas = document.getElementById("canvas");`
    canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mousePosition = [
        (event.clientX - rect.left) / rect.width * 2.0 - 1.0,   // x normalized to [-1, 1]
        -((event.clientY - rect.top) / rect.height * 2.0 - 1.0) // y normalized to [-1, 1]
    ];
});


     // prettier-ignore
  const data = new Float32Array([
    // x    y       u    v
    -1.0, -1.0,   0.0, 0.0,
     1.0, -1.0,   1.0, 0.0,
     1.0,  1.0,   1.0, 1.0,
    -1.0,  1.0,   0.0, 1.0,
  ]);
  // prettier-ignore
  const indices = new Uint16Array([
    0, 1, 2,
    0, 2, 3,
  ]);

    // Think of a VAO as a recipe card for a dish. Once you have the recipe card (VAO) set up with all the ingredients and steps (vertex attributes and buffers), you can easily recreate the dish (render the object) by following the card (binding the VAO).

    const vao = gl.createVertexArray(); // It stores the format of the vertex data as well as the buffer objects providing the vertex data
    gl.bindVertexArray(vao); // Binding a VAO means that it becomes the current VAO, and any subsequent vertex attribute and buffer calls will be stored in this VAO
    
    // setting up a Vertex Buffer Object (VBO) in WebGL to store vertex data for rendering
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(a_position);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 4 * 4, 0); // 2: x, y / false: no normalization / 5*4 : stride (total size of a vertex in bytes) / 0: offset
    gl.enableVertexAttribArray(a_uv);
    gl.vertexAttribPointer(a_uv, 2, gl.FLOAT, false, 4 * 4, 2 * 4); // 3: RGB? / false: no normalization / 5*4 stride / 2*4 offset (starting after the position data)

    const ebo = gl.createBuffer(); // Element Buffer Object : to decide which vertices to draw, can help reduce the amount of vertex data you need to send to the GPU
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    function loop() {

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.bindVertexArray(vao);
        gl.useProgram(program);
        gl.uniform2f(u_resolution, gl.canvas.width, gl.canvas.height);
        gl.uniform1f(u_time, time.t);
        gl.uniform1f(u_dt, time.dt());
        gl.uniform2f(u_mouse, mousePosition[0], mousePosition[1]); // Pass mouse position to the shader


        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

        time.update();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
}

main();