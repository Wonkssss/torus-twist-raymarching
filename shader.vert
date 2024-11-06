#version 300 es
in vec2 a_position;       // 2D position input for each vertex
in vec2 a_uv;          // RGB color input for each vertex

out vec2 f_uv;         // Output color that goes to the fragment shader

void main() {
    gl_Position = vec4(a_position, 0, 1); // Set the position in 3D space (z=0, w=1)
    f_uv = a_uv;                    // Pass the color to the fragment shader
}
