struct Uniforms {
    mx: f32,
    my: f32,
    res_x: f32,
    res_y: f32,
    ox: f32,
    oy: f32,
    zm: f32,
    time: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

__COMMON_FUNCTIONS__

__COLORING_FUNCTION__

@fragment
fn main(@builtin(position) FragCoord: vec4<f32>) -> @location(0) vec4<f32> {
    let res = vec2<f32>(uniforms.res_x, uniforms.res_y);
    let mouse = vec2<f32>(uniforms.mx, uniforms.my);
    let offset = vec2<f32>(uniforms.ox, uniforms.oy);
    let zoom = uniforms.zm;

    // 1. Normalized Coordinates (0 to 1)
    let min_res = min(uniforms.res_x, uniforms.res_y);
    let inv_res = 1.0 / min_res; // scalar

    // 2. Offset from center in pixels
    // (FragCoord.x * 2.0 - res_x)
    let coord = vec2<f32>(
        FragCoord.x * 2.0 - uniforms.res_x,
        FragCoord.y * 2.0 - uniforms.res_y
    );

    // 3. Normalized * Zoom
    let p = coord * inv_res * zoom;

    let time = uniforms.time;

    // 4. Mouse Logic (0..1 -> -1..1)
    let m = mouse * 2.0 - vec2<f32>(1.0, 1.0);

    // 5. Final Complex Plane Coordinate
    // x = p - m (Standard mandelbrot logic often centers around mouse or offset?)
    // In Double main:
    // term_x = p_x * zoom
    // m_x = mouse_x * 2 - 1
    // x_real = term_x - m_x
    // It seems "Offset" uniform (ox, oy) is NOT used in the calculation of 'x' in main.wgsl (double)?
    // Wait, let's re-read Double main.wgsl carefully.
    // Line 65: let offset_val = mat2x2<f32>(offset_x, offset_y);
    // Line 60: let x_real = dsub(term_x, m_x);
    // Line 63: let x = mat2x2<f32>(x_real, x_imag);
    // So 'x' (the pixel coordinate mapped to complex plane) depends on Mouse Position?
    // Usage of 'offset_val':
    // If Mandelbrot: z = offset_val; C = x;
    // If Julia: C = offset_val; z = x;
    // So 'offset_val' acts as the parameter (z0 for Mandelbrot, c for Julia).
    // And 'x' acts as the varying coordinate.

    let x = p - m;
    let offset_val = offset;

    var z: vec2<f32>;
    var C: vec2<f32>;

    __SELECT_PART__

    var j: i32 = 0;
    for (var i: i32 = 0; i < 1024; i++) {
        j = j + 1;
        let abs_sq = dot(z, z);
        if abs_sq > 25.0 { break; }

        z = __WGSL_EXPRESSION__;
    }

    return coloring(f32(j) / 1024.0);
}
