fn coloring(t: f32) -> vec4<f32> {
    return vec4<f32>(sin(t * 20.0 + uniforms.time), sin(t * 15.0 + uniforms.time), sin(t * 10.0), 1.0);
}
