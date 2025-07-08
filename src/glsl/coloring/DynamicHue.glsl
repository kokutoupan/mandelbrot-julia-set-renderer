vec4 coloring(float t) {
    vec3 rgb = hsv2rgb(vec3(mod(time * 20.0 + t*360.*4., 360.0) / 360.0, 0.8, 1.0));
    return vec4(rgb, 1.0);
}
