struct Uniforms {
    mx_hi: f32,
    mx_lo: f32,
    my_hi: f32,
    my_lo: f32,
    res_x: f32,
    res_y: f32,
    ox_hi: f32,
    ox_lo: f32,
    oy_hi: f32,
    oy_lo: f32,
    zm_hi: f32,
    zm_lo: f32,
    time: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

__COMMON_FUNCTIONS__

__COLORING_FUNCTION__

@fragment
fn main(@builtin(position) FragCoord: vec4<f32>) -> @location(0) vec4<f32> {
    let res = vec2<f32>(uniforms.res_x, uniforms.res_y);
    let mouse_x = vec2<f32>(uniforms.mx_hi, uniforms.mx_lo);
    let mouse_y = vec2<f32>(uniforms.my_hi, uniforms.my_lo);
    let offset_x = vec2<f32>(uniforms.ox_hi, uniforms.ox_lo);
    let offset_y = vec2<f32>(uniforms.oy_hi, uniforms.oy_lo);
    let zoom = vec2<f32>(uniforms.zm_hi, uniforms.zm_lo);

    // 1. 解像度の逆数を高精度で計算 (1.0 / min_res)
    let min_res = min(uniforms.res_x, uniforms.res_y);
    let inv_res = ddiv(vec2<f32>(1.0, 0.0), vec2<f32>(min_res, 0.0));

    // 2. 画面中心からのオフセットをピクセル単位で計算
    // (FragCoord.x * 2.0 - res_x)
    let coord_x = dsub(vec2<f32>(FragCoord.x * 2.0, 0.0), vec2<f32>(uniforms.res_x, 0.0));
    let coord_y = dsub(vec2<f32>(FragCoord.y * 2.0, 0.0), vec2<f32>(uniforms.res_y, 0.0));

    // 3. 正規化された高精度座標 p_x, p_y
    let p_x = dmul(coord_x, inv_res);
    let p_y = dmul(coord_y, inv_res);

    // 4. ここで zoom を掛ける
    let term_x = dmul(p_x, zoom);
    let term_y = dmul(p_y, zoom);

    let time = uniforms.time;
    let two = vec2<f32>(2.0, 0.0);

    let one = vec2<f32>(1.0, 0.0);

    let m_x = dsub(dmul(mouse_x, two), one);

    let m_y = dadd(dmul(mouse_y, two), -one);



    let x_real = dsub(term_x, m_x);
    let x_imag = dsub(term_y, m_y);

    let x = mat2x2<f32>(x_real, x_imag);

    let offset_val = mat2x2<f32>(offset_x, offset_y);

    var z: mat2x2<f32>;
    var C: mat2x2<f32>;

    __SELECT_PART__

    var j: i32 = 0;
    for (var i: i32 = 0; i < 1024; i++) {
        j = j + 1;
        let abs_sq = dadd(dmul(z[0], z[0]), dmul(z[1], z[1]));
        if abs_sq.x > 25.0 { break; }

        z = __WGSL_EXPRESSION__;
    }

    return coloring(f32(j) / 1024.0);
}
