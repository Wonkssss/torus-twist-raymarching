#version 300 es           // GLSL version (300 es for WebGL 2.0)
precision highp float; // set the default precision to highp (optional)

#define EPS         0.001
#define N_MAX_STEPS 80
#define MAX_DIST    100.0

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_dt;
uniform vec2 u_mouse; // Mouse position passed as uniform

in vec2 f_uv; //  input from the vertex shader
out vec4 outColor; // final output color of the fragment

// Smooth minimum function
float smin(float a, float b, float k) {
    k *= log(2.0);
    float x = b - a;
    return a + x / (1.0 - exp2(x / k));
}

// ----------------------------------------------------------------------------------------------------------------

// Signed distance function for a torus
float sdp_torus(vec3 p, vec2 t) {
    // calculate the distance for a torus
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

// Twist function to modify the SDF
float opTwist(vec3 p, float twistStrength) {
    float twistFactor = twistStrength * p.y; // Apply twist with a multiplier to control frequency
    float c = cos(twistFactor); 
    float s = sin(twistFactor);
    mat2 m = mat2(c, -s, s, c); // Rotation matrix
    vec3 q = vec3(m * p.xz, p.y);
    return sdp_torus(q, vec2(1.0, 0.4)); // Apply the twist to the torus
}

// Scene definition using the torus
float sdf_scene(vec3 p) {
   // Apply the twist if the mouse is near the torus
    float distToMouse = length(p.xz - u_mouse * vec2(2.0, 2.0)); // Mouse distance in normalized space

    // Apply twist based on proximity to the mouse
    float twistAmount = (distToMouse < 0.3) ? smoothstep(0.0, 0.3, distToMouse) * 10.0 : 0.3;
    
    // Twist the torus shape globally based on twistAmount
    return opTwist(p, twistAmount);
    
    //return torusDist;
}

// ----------------------------------------------------------------------------------------------------------------

// Ray marching function
float ray_march(vec3 ro, vec3 rd) {
    float t = 0.0;
    for (int i = 0; i < N_MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        float d = sdf_scene(p);
        t += d;
        if (d < EPS || t > MAX_DIST) break;
    }
    return t;
}

// Calculate approximate normal at point p
vec3 approx_normal(vec3 p) {
    vec2 eps = vec2(EPS, -EPS);
    return normalize(
        eps.xyy * sdf_scene(p + eps.xyy) + \
        eps.yyx * sdf_scene(p + eps.yyx) + \
        eps.yxy * sdf_scene(p + eps.yxy) + \
        eps.xxx * sdf_scene(p + eps.xxx)
    );
}

void main() {
    vec2 uv = (f_uv * 2.0 - 1.0) * u_resolution / u_resolution.y;

    // vec3 ro = vec3(0.0, 0.0, -3.0); // camera position
    vec3 ro = vec3(3.0 * sin(u_time * 0.3), 4.0, 3.0 * cos(u_time * 0.3)); // Camera rotates around the origin


    // Camera position and direction
    // vec3 ro = vec3(0.0, 2.0 * sin(u_time * 0.3), 2.0 * cos(u_time * 0.3)); // Camera moves around z-axis
    vec3 lookAt = vec3(0.0, 0.0, 0.0); // Center point we're looking at
    vec3 forward = normalize(lookAt - ro);
    vec3 right = normalize(cross(vec3(0.0, 0.0, 1.0), forward)); // Use z-axis as up vector for vertical orientation
    vec3 up = cross(forward, right);
    
    vec3 rd = normalize(forward + uv.x * right + uv.y * up); // Construct ray direction based on camera orientation

    // vec3 rd = normalize(vec3(uv, 1.0)); // ray direction


    vec3 a_col = vec3(185.0 / 255.0, 210.0 / 255.0, 250.0 / 255.0);
    vec3 col = a_col;

    vec3 l_dir = normalize(vec3(sin(u_time), 0.0, cos(u_time)));
    vec3 l_col = vec3(0.9, 0.4, 0.5);

    float t = ray_march(ro, rd);
    if (t <= MAX_DIST) {
        vec3 p = ro + rd * t;

        vec3 n = approx_normal(p);
        vec3 diff = vec3(max(0.0, dot(l_dir, n))) * l_col; // diffuse lighting,shading

        float k = max(0.0, dot(n, -rd));
        vec3 ref = vec3(pow(k, 4.0)) * 1.0 * l_col;

        col = mix(diff + ref, a_col, 0.1);
    }

    col = pow(col, vec3(0.4545));
    outColor = vec4(col, 1.0); // set the color with an alpha of 1.0 (fully opaque)
}
