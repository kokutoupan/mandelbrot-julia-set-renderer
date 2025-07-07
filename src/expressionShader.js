import init, { get_glsl_output_dd, set_panic_hook } from '../complex-parser/pkg/complex_parser.js';

await init();
set_panic_hook();

const coloringFunctions = [
    `
    vec4 coloring(float t) {
        return vec4(hsv2rgb(vec3(mod(time * 20.0, 360.0) / 360.0,0.8,1.0)) * t, 1.0);
    }
    `,
    `
    vec4 coloring(float t) {
        float hue = fract(t + 0.5 * sin(time * 0.5)); // time を使って色相を変化
        float saturation = 1.0;
        float value = smoothstep(0.0, 1.0, sqrt(t)); // 明るさの調整
        return vec4(hsv2rgb(vec3(hue, saturation, value)), 1.0);
    }
    `
    ,
    `
    vec4 coloring(float t) {
        vec3 rgb = hsv2rgb(vec3(mod(time * 20.0 + t*360.*4., 360.0) / 360.0, 0.8, 1.0));
        return vec4(rgb, 1.0);
    }
    `
    ,

    `
    vec4 coloring(float t) {
        float r = 0.5 + 0.5 * cos(6.28318 * (t + time * 0.1));
        float g = 0.5 + 0.5 * cos(6.28318 * (t + 0.33 + time * 0.1));
        float b = 0.5 + 0.5 * cos(6.28318 * (t + 0.67 + time * 0.1));
        return vec4(r, g, b, 1.0);
    }
    `
    ,
    `
    vec4 coloring(float t) {
        float intensity = pow(t, 0.5) * 2.0; // ルートを取ることで発光風
        float hue = fract(t + time * 0.1);
        return vec4(hsv2rgb(vec3(hue, 1.0, intensity)), 1.0);
    }
    `
]
    ;

export function expressionToShader(userInput, mode, sel) {

    // ユーザー入力の式をフラグメントシェーダに反映
    // const glslExpression = parseExpression(userInput);
    const glslExpression = get_glsl_output_dd(userInput);

    if (glslExpression.startsWith('Parse Error')) {
        alert(glslExpression);
        return;
    }


    const select_part = mode === 0 
    ? 'mat2 z = d_offset; mat2 C = dcmul(x, mat2(d_zoom, vec2(0.0)));' 
    : 'mat2 C = d_offset; mat2 z = dcmul(x, mat2(d_zoom, vec2(0.0)));';


    // 色付けの部分
    const coloring = coloringFunctions[sel];

    const fs = `#version 300 es
    precision highp float;

    layout(std140) uniform ShaderData {
        vec2 mouse;
        vec2 resolution;
        vec2 offset;
        float time;
        float zoom;
    };
    out vec4 outColor;
    const float PI = 3.14159265359;
    
    // HSVからRGBへ変換
    vec3 hsv2rgb(vec3 c) {
        vec3 p = abs(fract(c.x + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
        return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
    }

    ${coloring}
  
//==================================================================
// GLSL Double-Double Real Arithmetic Library
// using vec2 as a double-double number (x = high part, y = low part)
//==================================================================

// -- 定数 --
const float SPLITTER = 134217729.0; // 2^27 + 1

// -- ヘルパー関数 (内部利用) --

// 2つのfloatの和を誤差なくvec2(hi, lo)で返す (高速版)
vec2 fast_two_sum(float a, float b) {
    float hi = a + b;
    float b_virtual = hi - a;
    float lo = b - b_virtual;
    return vec2(hi, lo);
}

// 2つのfloatの和を誤差なくvec2(hi, lo)で返す (通常版)
vec2 two_sum(float a, float b) {
    float hi = a + b;
    float a_virtual = hi - b;
    float b_virtual = hi - a_virtual;
    float a_error = a - a_virtual;
    float b_error = b - b_virtual;
    float lo = a_error + b_error;
    return vec2(hi, lo);
}

// floatを上位ビットと下位ビットに分割する
vec2 split(float a) {
    float temp = SPLITTER * a;
    float a_hi = temp - (temp - a);
    float a_lo = a - a_hi;
    return vec2(a_hi, a_lo);
}

// 2つのfloatの積を誤差なくvec2(hi, lo)で返す
vec2 two_product(float a, float b) {
    float hi = a * b;
    vec2 a_split = split(a);
    vec2 b_split = split(b);
    float err1 = hi - (a_split.x * b_split.x);
    float err2 = err1 - (a_split.x * b_split.y);
    float err3 = err2 - (a_split.y * b_split.x);
    float lo = (a_split.y * b_split.y) - err3;
    return vec2(hi, lo);
}


//==================================================================
// 実数 基本演算 (d + function name)
//==================================================================

// 加算: a + b
vec2 dadd(vec2 a, vec2 b) {
    vec2 s = two_sum(a.x, b.x);
    vec2 t = two_sum(a.y, b.y);
    s.y += t.x;
    s = fast_two_sum(s.x, s.y);
    s.y += t.y;
    return fast_two_sum(s.x, s.y);
}

// 減算: a - b
vec2 dsub(vec2 a, vec2 b) {
    vec2 s = two_sum(a.x, -b.x);
    vec2 t = two_sum(a.y, -b.y);
    s.y += t.x;
    s = fast_two_sum(s.x, s.y);
    s.y += t.y;
    return fast_two_sum(s.x, s.y);
}

// 単項マイナス: -a
vec2 dneg(vec2 a) {
    return vec2(-a.x, -a.y);
}

// 乗算: a * b
vec2 dmul(vec2 a, vec2 b) {
    vec2 p = two_product(a.x, b.x);
    p.y += a.x * b.y + a.y * b.x;
    return fast_two_sum(p.x, p.y);
}

// 除算: a / b
vec2 ddiv(vec2 a, vec2 b) {
    float q1 = a.x / b.x;
    vec2 p = dmul(vec2(q1, 0.0), b);
    vec2 d = dsub(a, p);
    float q2 = d.x / b.x;
    // 精度向上のため、もう一段階計算を追加
    p = dmul(vec2(q2, 0.0), b);
    d = dsub(d, p);
    float q3 = d.x / b.x;
    // 結果を合計
    vec2 s = two_sum(q1, q2);
    return dadd(s, vec2(q3, 0.0));
}


//==================================================================
// 実数 数学関数 (d + function name)
//==================================================================

vec2 dsqrt(vec2 a);
vec2 datan(vec2 a); // 事前宣言

// 平方根: sqrt(a)
vec2 dsqrt(vec2 a) {
    if (a.x <= 0.0) return vec2(0.0, 0.0);
    float x_inv = 1.0 / sqrt(a.x);
    vec2 r = vec2(a.x * x_inv, 0.0); // 初期値
    r = dadd(r, ddiv(a, r));
    r = dmul(r, vec2(0.5, 0.0));
    r = dadd(r, ddiv(a, r));
    r = dmul(r, vec2(0.5, 0.0));
    return r;
}

// 指数関数: exp(a)
vec2 dexp(vec2 a) {
    float hi = exp(a.x);
    float lo = hi * a.y;
    return dadd(vec2(hi, 0.0), dmul(vec2(hi, lo), dsub(a, vec2(log(hi), 0.0))));
}

// 自然対数: ln(a), log(a)
vec2 dln(vec2 a) {
    float hi = log(a.x);
    vec2 t = dsub(a, dexp(vec2(hi, 0.0)));
    return dadd(vec2(hi, 0.0), ddiv(t, a));
}
vec2 dlog(vec2 a) { return dln(a); }

// sin(a) と cos(a) を同時に計算
void dsincos(vec2 a, out vec2 sin_val, out vec2 cos_val) {
    float s = sin(a.x);
    float c = cos(a.x);
    vec2 dr = dsub(a, vec2(a.x, 0.0));
    sin_val = dadd(vec2(s, 0.0), dmul(dr, vec2(c, 0.0)));
    cos_val = dsub(vec2(c, 0.0), dmul(dr, vec2(s, 0.0)));
}
vec2 dsin(vec2 a) { vec2 s, c; dsincos(a, s, c); return s; }
vec2 dcos(vec2 a) { vec2 s, c; dsincos(a, s, c); return c; }
vec2 dtan(vec2 a) { vec2 s, c; dsincos(a, s, c); return ddiv(s, c); }

// 逆三角関数
vec2 dasin(vec2 a) { return datan(ddiv(a, dsqrt(dsub(vec2(1.0, 0.0), dmul(a, a))))); }
vec2 dacos(vec2 a) { return dsub(vec2(atan(1.0) * 2.0, 0.0), dasin(a)); } // pi/2 - asin(a)
vec2 datan(vec2 a) { return dmul(vec2(0.5, 0.0), dln(ddiv(dadd(vec2(1.0, 0.0), a), dsub(vec2(1.0, 0.0), a)))); } // atan(x) = 0.5 * log((1+x)/(1-x))

// べき乗: pow(base, exp)
vec2 dpow(vec2 base, vec2 exp) { return dexp(dmul(exp, dln(base))); }

//================================================================================
// GLSL Double-Double Complex Arithmetic Library
// using mat2 as a double-double complex number
// mat2(real_part_vec2, imag_part_vec2)
//================================================================================

// 加算: a + b
mat2 dcadd(mat2 a, mat2 b) {
    return mat2(dadd(a[0], b[0]), dadd(a[1], b[1]));
}

// 減算: a - b
mat2 dcsub(mat2 a, mat2 b) {
    return mat2(dsub(a[0], b[0]), dsub(a[1], b[1]));
}

// 符号反転: -a
mat2 dcneg(mat2 a) {
    return mat2(dneg(a[0]), dneg(a[1]));
}

// 乗算: a * b
mat2 dcmul(mat2 a, mat2 b) {
    vec2 r = dsub(dmul(a[0], b[0]), dmul(a[1], b[1]));
    vec2 i = dadd(dmul(a[0], b[1]), dmul(a[1], b[0]));
    return mat2(r, i);
}

// 共役: conj(a)
mat2 dcconj(mat2 a) {
    return mat2(a[0], dneg(a[1]));
}

// ノルムの2乗: |a|^2
vec2 dcnorm2(mat2 a) {
    return dadd(dmul(a[0], a[0]), dmul(a[1], a[1]));
}

// ノルム(絶対値): |a|
vec2 dcabs(mat2 a) {
    return dsqrt(dcnorm2(a));
}

// 逆数: 1 / a
mat2 dcinv(mat2 a) {
    vec2 denom = dcnorm2(a);
    return mat2(ddiv(a[0], denom), ddiv(dneg(a[1]), denom));
}

// 除算: a / b
mat2 dcdiv(mat2 a, mat2 b) {
    vec2 denom = dcnorm2(b);
    mat2 numer = dcmul(a, dcconj(b));
    return mat2(ddiv(numer[0], denom), ddiv(numer[1], denom));
}

// 平方根: sqrt(a)
mat2 dcsqrt(mat2 a) {
    vec2 r = dcabs(a);
    vec2 half_v = vec2(0.5, 0.0);
    vec2 sr = dsqrt(dmul(dadd(r, a[0]), half_v));
    vec2 si = dsqrt(dmul(dsub(r, a[0]), half_v));
    if (a[1].x < 0.0) {
        si = dneg(si);
    }
    return mat2(sr, si);
}

// 指数関数: exp(a)
mat2 dcexp(mat2 a) {
    vec2 exp_r = dexp(a[0]);
    vec2 cos_i, sin_i;
    dsincos(a[1], sin_i, cos_i);
    return mat2(dmul(exp_r, cos_i), dmul(exp_r, sin_i));
}

// 自然対数: ln(a), log(a)
mat2 dcln(mat2 a) {
    vec2 r = dcabs(a);
    vec2 arg = datan(ddiv(a[1], a[0]));
    return mat2(dln(r), arg);
}
mat2 dclog(mat2 a) { return dcln(a); }

// べき乗: pow(base, exp)
mat2 dcpow(mat2 base, mat2 exp) {
    return dcexp(dcmul(exp, dcln(base)));
}

// サイン: sin(a)
mat2 dcsin(mat2 a) {
    vec2 sin_r, cos_r;
    dsincos(a[0], sin_r, cos_r);
    vec2 sinh_i = dexp(a[1]);
    vec2 cosh_i = dmul(vec2(0.5, 0.0), dadd(sinh_i, ddiv(vec2(1.0, 0.0), sinh_i)));
    sinh_i = dmul(vec2(0.5, 0.0), dsub(sinh_i, ddiv(vec2(1.0, 0.0), sinh_i)));
    return mat2(dmul(sin_r, cosh_i), dmul(cos_r, sinh_i));
}

// コサイン: cos(a)
mat2 dccos(mat2 a) {
    vec2 sin_r, cos_r;
    dsincos(a[0], sin_r, cos_r);
    vec2 sinh_i = dexp(a[1]);
    vec2 cosh_i = dmul(vec2(0.5, 0.0), dadd(sinh_i, ddiv(vec2(1.0, 0.0), sinh_i)));
    sinh_i = dmul(vec2(0.5, 0.0), dsub(sinh_i, ddiv(vec2(1.0, 0.0), sinh_i)));
    return mat2(dmul(cos_r, cosh_i), dneg(dmul(sin_r, sinh_i)));
}

// タンジェント: tan(a)
mat2 dctan(mat2 a) {
    return dcdiv(dcsin(a), dccos(a));
}
    
    // メイン関数
    void main(void){
    mat2 t = mat2(time, 0.0,0.0,0.0); // 必要なら時間も変換
    vec2 d_zoom = vec2(zoom, 0.0);
    mat2 d_offset = mat2(vec2(offset.x, 0.0), vec2(offset.y, 0.0));


    // 1. マウス位置を倍々精度複素数に変換
    vec2 m_real = dsub(dmul(vec2(mouse.x, 0.0), vec2(2.0, 0.0)), vec2(1.0, 0.0));
    vec2 m_imag = dadd(dmul(vec2(-mouse.y, 0.0), vec2(2.0, 0.0)), vec2(1.0, 0.0));
    mat2 m = mat2(m_real, m_imag);

    // 2. ピクセル座標 (gl_FragCoord) を倍々精度複素数 p に変換
    vec2 d_frag_x = vec2(gl_FragCoord.x, 0.0);
    vec2 d_frag_y = vec2(gl_FragCoord.y, 0.0);
    vec2 d_res_x = vec2(resolution.x, 0.0);
    vec2 d_res_y = vec2(resolution.y, 0.0);
    vec2 d_two = vec2(2.0, 0.0);
    vec2 num_r = dsub(dmul(d_frag_x, d_two), d_res_x);
    vec2 num_i = dsub(dmul(d_frag_y, d_two), d_res_y);
    vec2 denom = vec2(min(resolution.x, resolution.y), 0.0);
    mat2 p = mat2(ddiv(num_r, denom), ddiv(num_i, denom));
    
    // 3. ズームとパンを適用した座標 x を計算
    // uniformから変換した d_zoom を使用
    mat2 x = dcsub(p, dcdiv(m, mat2(d_zoom, vec2(0.0))));
      int j = 0;
        ${select_part}
  
        for(int i = 0; i < 2048; i++){
            j++;
            if(dot(z[0],z[0]) > 100.0){ break; }
  
            // ユーザーの式を動的に使う部分
            // ここでは 'z = z * z + c' などの式を文字列で組み込む
           z = ${glslExpression};
  
        }

        outColor = coloring(float(j)/2048.0);
    }
    `;

    console.log(fs);
    return fs;
}
