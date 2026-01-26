#version 300 es
precision highp float;

// Uniforms for Double Precision
// Layout must match WebGLRenderer packing logic
layout(std140) uniform ShaderData {
    vec2 mouse_x;   // 0 (8 bytes)
    vec2 mouse_y;   // 8 (8 bytes)
    vec2 resolution;// 16 (8 bytes) - treating as 2 floats
    vec2 offset_x;  // 24 (8 bytes) - Real(hi, lo)
    vec2 offset_y;  // 32 (8 bytes) - Imag(hi, lo)
    vec2 zoom;      // 40 (8 bytes) - Zoom(hi, lo)
    float time;     // 48 (4 bytes)
                    // Total 52 bytes. Aligned to 16-byte boundary -> 64 bytes?
};

out vec4 outColor;

__COMMON_FUNCTIONS__

__COLORING_FUNCTION__

void main(void){
    // resolution is single precision derived (2 floats)
    vec2 res = resolution; 
    
    // mouse is double precision (mouse_x, mouse_y)
    // normalized mouse coord [-1, 1]
    // m = vec2(mouse.x * 2.0 - 1.0, -mouse.y * 2.0 + 1.0);
    // Double arithmetic:
    // vec2 m_x = dsub(dmul(mouse_x, vec2(2.0, 0.0)), vec2(1.0, 0.0));
    // vec2 m_y = dadd(dmul(dneg(mouse_y), vec2(2.0, 0.0)), vec2(1.0, 0.0));
    
    // But mouse_x/y passed from CPU are already raw coordinates or screen ratio?
    // InputManager sends mx, my which are aspect ratio corrected coordinates?
    // InputManager: mx [-2, 3], my [-2, 3].
    // So mouse_x, mouse_y ARE the center of screen in complex plane (if pan).
    // Wait, let's check single main.glsl:
    // vec2 m = vec2(mouse.x * 2.0 - 1.0, -mouse.y * 2.0 + 1.0);
    // InputManager sends: mx, my.
    // If mx is 0.5 (default), m.x = 0.0.
    // So `m` is the center.
    // In Double, we pass mouse_x, mouse_y as split doubles of mx, my.
    // So we need to apply the mapping `* 2.0 - 1.0`.
    
    vec2 two = vec2(2.0, 0.0);
    vec2 one = vec2(1.0, 0.0);
    
    vec2 m_x = dsub(dmul(mouse_x, two), one);
    vec2 m_y = dadd(dmul(dneg(mouse_y), two), one);
    
    // Pixel Coordinate p (Single)
    // vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
    // We can compute p in single precision usually, then convert to double?
    // High precision is needed for the final coordinate `x`.
    // x = p * zoom - m
    // If zoom is very small (high magnification), p * zoom is very small.
    // -m is large.
    // Precision is needed when adding small p*zoom to large m.
    
    vec2 p = (gl_FragCoord.xy * 2.0 - res) / min(res.x, res.y);
    
    // Convert p to Double
    vec2 p_x = vec2(p.x, 0.0);
    vec2 p_y = vec2(p.y, 0.0);
    
    // Calculate x = p * zoom - m
    // x_real = p.x * zoom - m.x
    // x_imag = p.y * zoom - m.y
    
    vec2 term_x = dmul(p_x, zoom);
    vec2 term_y = dmul(p_y, zoom);
    
    vec2 x_real = dsub(term_x, m_x);
    vec2 x_imag = dsub(term_y, m_y);
    
    mat2 x = mat2(x_real, x_imag);
    
    // Offset (Initial Value or C)
    mat2 offset_val = mat2(offset_x, offset_y);
    
    // Constants
    mat2 C; 
    mat2 z;
    
    // Select Part
    // SELECT_PART will be:
    // vec2 z_real = offset_x; vec2 z_imag = offset_y; mat2 z = mat2(z_real, z_imag); mat2 C = x;
    // but we use mat2 for both.
    
    __SELECT_PART__
    
    int j = 0;
    for(int i = 0; i < 1024; i++){
        j++;
        // dot(z,z) > 25.0
        // complex abs squared: x^2 + y^2
        // dadd(dmul(z[0], z[0]), dmul(z[1], z[1])) -> vec2 (result)
        // compare result.x > 25.0
        vec2 abs_sq = dadd(dmul(z[0], z[0]), dmul(z[1], z[1]));
        if(abs_sq.x > 25.0){ break; }
        
        // z = GLSL_EXPRESSION;
        // Expression uses z (mat2), C (mat2) and Double functions (dcadd etc)
        z = __GLSL_EXPRESSION__;
    }
    
    outColor = coloring(float(j)/1024.0);
}
