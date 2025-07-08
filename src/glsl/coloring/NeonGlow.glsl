vec4 coloring(float t) {
    float intensity = pow(t, 0.5) * 2.0; // ルートを取ることで発光風
    float hue = fract(t + time * 0.1);
    return vec4(hsv2rgb(vec3(hue, 1.0, intensity)), 1.0);
}
