vec4 coloring(float t) {
    float hue = fract(t + 0.5 * sin(time * 0.5)); // time を使って色相を変化
    float saturation = 1.0;
    float value = smoothstep(0.0, 1.0, sqrt(t)); // 明るさの調整
    return vec4(hsv2rgb(vec3(hue, saturation, value)), 1.0);
}
