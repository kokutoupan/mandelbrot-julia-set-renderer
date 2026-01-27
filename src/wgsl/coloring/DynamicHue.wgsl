fn coloring(t: f32) -> vec4<f32> {
    return vec4<f32>(hsv2rgb(vec3<f32>(t + uniforms.time * 0.1, 0.8, 1.0)), 1.0);
}
