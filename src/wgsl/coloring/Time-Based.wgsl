fn coloring(t: f32) -> vec4<f32> {
    return vec4<f32>(hsv2rgb(vec3<f32>((uniforms.time * 20.0) % 360.0 / 360.0, 0.8, 1.0)) * t, 1.0);
}
