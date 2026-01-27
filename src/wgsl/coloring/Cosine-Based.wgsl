fn coloring(t: f32) -> vec4<f32> {
    return vec4<f32>(0.5 + 0.5 * cos(3.0 + t * 20.0 + vec3<f32>(0.0, 0.6, 1.0) + uniforms.time * 0.0), 1.0);
}
