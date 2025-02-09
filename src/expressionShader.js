import { parseExpression } from './parser.js';


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
    const glslExpression = parseExpression(userInput);


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
    out vec4 outColor; // ✅ gl_FragColor の代わり

  
    const float PI = 3.14159265359;
    


    // HSVからRGBへ変換
    vec3 hsv2rgb(vec3 c) {
        vec3 p = abs(fract(c.x + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
        return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
    }


    ${coloring}
  
    // 複素数四則演算
    vec2 add(vec2 a, vec2 b) {
        return a + b;
    }
    vec2 sub(vec2 a, vec2 b) {
        return a - b;
    }
    vec2 mult(vec2 a, vec2 b) {
        return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
    }
    vec2 div(vec2 a, vec2 b) {
        float denom = b.x * b.x + b.y * b.y;
        return vec2((a.x * b.x + a.y * b.y) / denom, (a.y * b.x - a.x * b.y) / denom);
    }
  
    float add(float a, float b) {
        return a + b;
    }
    float sub(float a, float b) {
        return a - b;
    }
    float mult(float a, float b) {
        return a * b;
    }
    float div(float a, float b) {
        return a / b;
    }
  
    vec2 add(float a, vec2 b) {
        return vec2(a, 0.0) + b;
    }
    vec2 sub(float a, vec2 b) {
        return vec2(a, 0.0) - b;
    }
    vec2 mult(float a, vec2 b) {
        return vec2(a * b.x, a * b.y);
    }
    vec2 div(float a, vec2 b) {
        float denom = b.x * b.x + b.y * b.y;
        return vec2(a * b.x / denom, -a * b.y / denom);
    }
  
    vec2 add(vec2 a, float b) {
        return vec2(a.x + b,a.y);
    }
    vec2 sub(vec2 a, float b) {
        return vec2(a.x - b ,a.y);
    }
    vec2 mult(vec2 a, float b) {
        return a * b;
    }
    vec2 div(vec2 a, float b) {
        return a / b;
    }
  
    // 複素数演算
    float Re(vec2 z) {
        return z.x;
    }
    float Im(vec2 z) {
        return z.y;
    }
    vec2 complex(float a, float b) {
        return vec2(a, b);
    }
  
    // 複素数の偏角（位相）
    float argC(vec2 z) {
        return atan(z.y, z.x);
    }
  
    // 複素指数関数: exp(a + bi) = e^a * (cos(b) + i sin(b))
    vec2 expC(vec2 z) {
        float eRe = exp(z.x);
        return vec2(eRe * cos(z.y), eRe * sin(z.y));
    }
  
    // 複素対数関数: log(z) = log(|z|) + i arg(z)
    vec2 logC(vec2 z) {
        return vec2(log(length(z)), argC(z));
    }
  
    // 複素数のべき乗: z^w = exp(w * log(z))
    vec2 powC(vec2 base, vec2 exponent) {
        return expC(vec2(exponent.x * logC(base).x - exponent.y * logC(base).y,
                                  exponent.x * logC(base).y + exponent.y * logC(base).x));
    }
  
    // 複素数のべき乗（実数指数）: z^r = exp(r * log(z))
    vec2 powC(vec2 base, float exponent) {
        vec2 logBase = logC(base);
        vec2 mul = vec2(exponent * logBase.x, exponent * logBase.y);
        return expC(mul);
    }
    
    float absC(vec2 z) {
        return length(z);
    }
  
    vec2 conjC(vec2 z) {
        return vec2(z.x, -z.y);
    }
  
    // 平方根
    vec2 sqrtC(vec2 z) {
        float r = sqrt(absC(z));
        float theta = argC(z) / 2.0;
        return vec2(r * cos(theta), r * sin(theta));
    }
  
    // 三角関数
    vec2 sinC(vec2 v) {
        return vec2(sin(v.x) * cosh(v.y), cos(v.x) * sinh(v.y));    
    }
    
    vec2 cosC(vec2 v) {
        return vec2(cos(v.x) * cosh(v.y), -sin(v.x) * sinh(v.y));
    }
  
    vec2 tanC(vec2 z) {
        return div(sinC(z), cosC(z));
    }
  
    vec2 asinC(vec2 z) {
        vec2 iz = vec2(-z.y, z.x);
        vec2 sqrt_val = logC(add(iz, sqrtC(sub(vec2(1.0, 0.0), mult(z, z)))));
        return vec2(-sqrt_val.y, sqrt_val.x);
    }
    
    vec2 acosC(vec2 z) {
        vec2 sqrt_val = logC(add(z, sqrtC(sub(mult(z, z), vec2(1.0, 0.0)))));
        return vec2(PI / 2.0 - sqrt_val.y, -sqrt_val.x);
    }
  
    vec2 atanC(vec2 z) {
        vec2 iz = vec2(-z.y, z.x);
        vec2 log1 = logC(sub(vec2(1.0, 0.0), iz));
        vec2 log2 = logC(add(vec2(1.0, 0.0), iz));
        return mult(vec2(0.0, -0.5), sub(log1, log2));
    }
  
    
  
    //オーバーロード
    
    
    // メイン関数
    void main(void){
        vec2 m = vec2(mouse.x * 2.0 - 1.0, -mouse.y * 2.0 + 1.0);
        vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
        float t = time;
        int j = 0;
        vec2 x = p - m / zoom;
        float y = zoom;
        ${select_part}
  
        for(int i = 0; i < 1024; i++){
            j++;
            if(length(z) > 5.0){ break; }
  
            // ユーザーの式を動的に使う部分
            // ここでは 'z = z * z + c' などの式を文字列で組み込む
            ${glslExpression};
  
        }

        outColor = coloring(float(j)/1024.0);
    }
    `;

    console.log(fs);
    return fs;
}