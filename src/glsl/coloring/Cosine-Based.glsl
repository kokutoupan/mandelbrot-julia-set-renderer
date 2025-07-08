vec4 coloring(float t) {
    float r = 0.5 + 0.5 * cos(6.28318 * (t + time * 0.1));
    float g = 0.5 + 0.5 * cos(6.28318 * (t + 0.33 + time * 0.1));
    float b = 0.5 + 0.5 * cos(6.28318 * (t + 0.67 + time * 0.1));
    return vec4(r, g, b, 1.0);
}
