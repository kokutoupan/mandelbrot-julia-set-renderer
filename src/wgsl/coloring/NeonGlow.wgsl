fn coloring(t: f32) -> vec4<f32> {
    let glow = abs(sin(t * 50.0 - uniforms.time * 2.0));
    return vec4<f32>(vec3<f32>(0.0, 1.0, 1.0) * glow * t, 1.0);
}
