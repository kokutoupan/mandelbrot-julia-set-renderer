#version 300 es

precision highp float;

layout(std140) uniform ShaderData {
    vec2 mouse;
    vec2 resolution;
    vec2 offset;
    float time;
    float zoom;
};
out vec4 outColor;

__COMMON_FUNCTIONS__

__COLORING_FUNCTION__

// メイン関数
void main(void){
    vec2 m = vec2(mouse.x * 2.0 - 1.0, -mouse.y * 2.0 + 1.0);
    vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
    vec2 t = vec2(time,0.);
    int j = 0;
    vec2 x = p * zoom - m;

    __SELECT_PART__

    for(int i = 0; i < 1024; i++){
        j++;
        if(dot(z,z) > 25.0){ break; }

        // ユーザーの式を動的に使う部分
        // ここでは 'z = z * z + c' などの式を文字列で組み込む
        z = __GLSL_EXPRESSION__;

    }

    outColor = coloring(float(j)/1024.0);
}
