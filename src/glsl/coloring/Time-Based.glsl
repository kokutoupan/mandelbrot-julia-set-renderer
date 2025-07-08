vec4 coloring(float t) {
  return vec4(hsv2rgb(vec3(mod(time * 20.0, 360.0) / 360.0,0.8,1.0)) * t, 1.0);
}
