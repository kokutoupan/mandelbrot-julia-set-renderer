#version 300 es
precision highp float;

// Uniforms for Double Precision
// Layout must match WebGLRenderer packing logic
layout(std140) uniform ShaderData {
    float mx_hi; float mx_lo;
    float my_hi; float my_lo;
    float res_x; float res_y;
    float ox_hi; float ox_lo;
    float oy_hi; float oy_lo;
    float zm_hi; float zm_lo;
    float time;
};

out vec4 outColor;

__COMMON_FUNCTIONS__

__COLORING_FUNCTION__

void main(void){
    // Reconstruct vec2s from floats
    vec2 res = vec2(res_x, res_y);
    vec2 mouse_x = vec2(mx_hi, mx_lo);
    vec2 mouse_y = vec2(my_hi, my_lo);
    vec2 offset_x = vec2(ox_hi, ox_lo);
    vec2 offset_y = vec2(oy_hi, oy_lo);
    vec2 zoom = vec2(zm_hi, zm_lo);

    vec2 m_x = dsub(dmul(mouse_x, vec2(2.0, 0.0)), vec2(1.0, 0.0));
    vec2 m_y = dadd(dmul(dneg(mouse_y), vec2(2.0, 0.0)), vec2(1.0, 0.0));
    
    vec2 p = (gl_FragCoord.xy * 2.0 - res) / min(res.x, res.y);
    
    vec2 p_x = vec2(p.x, 0.0);
    vec2 p_y = vec2(p.y, 0.0);
    
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
