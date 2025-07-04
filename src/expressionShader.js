import init, { get_glsl_output, set_panic_hook } from '../complex-parser/pkg/complex_parser.js';

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
    const glslExpression = get_glsl_output(userInput);

    if (glslExpression.startsWith('Parse Error')) {
        alert(glslExpression);
        return;
    }


    const select_part = mode === 0 ? 'vec2 z = offset; vec2 C = x* y;' : 'vec2 C = offset; vec2 z = x * y;';


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
  
/**
 * GLSL Helper Functions for Complex Number Operations
 * A complex number z = x + iy is represented as vec2(x, y).
 */

// ---------------------------------------------
// Section 1: Core Arithmetic & Hyperbolic Funcs
// ---------------------------------------------

// Complex multiplication: (a+bi) * (c+di) = (ac-bd) + (ad+bc)i
vec2 cmul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

// Complex division: (a+bi) / (c+di)
vec2 cdiv(vec2 a, vec2 b) {
    float d = dot(b, b); // Denominator: |b|^2
    // Return (0,0) if denominator is zero to avoid division by zero
    if (d == 0.0) {
        return vec2(0.0, 0.0);
    }
    return vec2(dot(a, b), a.y * b.x - a.x * b.y) / d;
}

// ---------------------------------------------
// Section 2: Exponential, Logarithmic, Power
// ---------------------------------------------

// Complex natural logarithm: log(z) = log|z| + i*arg(z)
vec2 clog(vec2 z) {
    // Return (0,0) if z is zero
    float r = length(z);
    if (r == 0.0) {
        return vec2(0.0, 0.0);
    }
    return vec2(log(r), atan(z.y, z.x));
}

// Complex exponential: exp(x+iy) = e^x * (cos(y) + i*sin(y))
vec2 cexp(vec2 z) {
    return exp(z.x) * vec2(cos(z.y), sin(z.y));
}

// Complex power: z^w = exp(w * log(z))
vec2 cpow(vec2 base, vec2 exponent) {
    // Return (0,0) if base is zero
    if (length(base) == 0.0) {
        return vec2(0.0, 0.0);
    }
    return cexp(cmul(exponent, clog(base)));
}

// ---------------------------------------------
// Section 3: Trigonometric & Inverse Trig Funcs
// ---------------------------------------------

// Complex square root
vec2 csqrt(vec2 z) {
    float r = length(z);
    return sqrt(r) * vec2(sqrt(0.5 * (r + z.x)), sign(z.y) * sqrt(0.5 * (r - z.x)));
}

// Complex sine: sin(x+iy) = sin(x)cosh(y) + i*cos(x)sinh(y)
vec2 csin(vec2 z) {
    return vec2(sin(z.x) * cosh(z.y), cos(z.x) * sinh(z.y));
}

// Complex cosine: cos(x+iy) = cos(x)cosh(y) - i*sin(x)sinh(y)
vec2 ccos(vec2 z) {
    return vec2(cos(z.x) * cosh(z.y), -sin(z.x) * sinh(z.y));
}

// Complex tangent: tan(z) = csin(z) / ccos(z)
vec2 ctan(vec2 z) {
    return cdiv(csin(z), ccos(z));
}

// Complex arcsin: asin(z) = -i * log(i*z + sqrt(1-z^2))
vec2 casin(vec2 z) {
    vec2 i = vec2(0.0, 1.0);
    vec2 one = vec2(1.0, 0.0);
    vec2 log_val = clog(cmul(i, z) + csqrt(one - cmul(z, z)));
    // multiply by -i (which is vec2(0, -1))
    return vec2(log_val.y, -log_val.x);
}

// Complex arccos: acos(z) = pi/2 - asin(z)
vec2 cacos(vec2 z) {
    const float PI_2 = 1.57079632679;
    return vec2(PI_2, 0.0) - casin(z);
}

// Complex arctan: atan(z) = (i/2) * log((i-z)/(i+z))
vec2 catan(vec2 z) {
    vec2 i = vec2(0.0, 1.0);
    vec2 num = i - z;
    vec2 den = i + z;
    return cmul(vec2(0.0, 0.5), clog(cdiv(num, den)));
}
    
    // メイン関数
    void main(void){
        vec2 m = vec2(mouse.x * 2.0 - 1.0, -mouse.y * 2.0 + 1.0);
        vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
        vec2 t = vec2(time,0.);
        int j = 0;
        vec2 x = p - m / zoom;
        float y = zoom;

        ${select_part}
  
        for(int i = 0; i < 1024; i++){
            j++;
            if(length(z) > 5.0){ break; }
  
            // ユーザーの式を動的に使う部分
            // ここでは 'z = z * z + c' などの式を文字列で組み込む
            z = ${glslExpression};
  
        }

        outColor = coloring(float(j)/1024.0);
    }
    `;

    console.log(fs);
    return fs;
}
