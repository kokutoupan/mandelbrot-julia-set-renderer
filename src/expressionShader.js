import init, { get_glsl_output, set_panic_hook } from '../complex-parser/pkg/complex_parser.js';

import mainTemplate from './glsl/main.glsl?raw';
import commonFunctions from './glsl/Common.glsl?raw';
import timeBased from './glsl/coloring/Time-Based.glsl?raw';
import sinusoidal from './glsl/coloring/Sinusoidal.glsl?raw';
import dynamicHue from './glsl/coloring/DynamicHue.glsl?raw';
import cosineBased from './glsl/coloring/Cosine-Based.glsl?raw';
import neonGlow from './glsl/coloring/NeonGlow.glsl?raw';

await init();
set_panic_hook();

const coloringShaders = [
  timeBased,
  sinusoidal,
  dynamicHue,
  cosineBased,
  neonGlow
];

export async function expressionToShader(userInput, mode, sel) {

    // ユーザー入力の式をフラグメントシェーダに反映
    const glslExpression = get_glsl_output(userInput);

    if (glslExpression.startsWith('Parse Error')) {
        alert(glslExpression);
        return;
    }


    const select_part = mode === 0 ? 'vec2 z = offset; vec2 C = x;' : 'vec2 C = offset; vec2 z = x;';
    const coloringFunction = coloringShaders[sel];

    try{
        const finalShader = mainTemplate
            .replace('__COMMON_FUNCTIONS__', commonFunctions)
            .replace('__COLORING_FUNCTION__', coloringFunction)
            .replace('__SELECT_PART__', select_part)
            .replace('__GLSL_EXPRESSION__', glslExpression);
        console.log('z = ' + glslExpression);
        
        return finalShader;

    }catch(e){
        console.error('シェーダファイルの読み込みに失敗しました:', e);
        alert('シェーダの構築に失敗しました。');
    }
}
