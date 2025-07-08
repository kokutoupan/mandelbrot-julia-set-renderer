import init, { get_glsl_output, set_panic_hook } from '../complex-parser/pkg/complex_parser.js';

await init();
set_panic_hook();

const coloringFunctionPaths = [
  './src/glsl/coloring/Time-Based.glsl',
  './src/glsl/coloring/Sinusoidal.glsl',
  './src/glsl/coloring/DynamicHue.glsl',
  './src/glsl/coloring/Cosine-Based.glsl',
  './src/glsl/coloring/NeonGlow.glsl',
];

export async function expressionToShader(userInput, mode, sel) {

    // ユーザー入力の式をフラグメントシェーダに反映
    // const glslExpression = parseExpression(userInput);
    const glslExpression = get_glsl_output(userInput);

    if (glslExpression.startsWith('Parse Error')) {
        alert(glslExpression);
        return;
    }


    const select_part = mode === 0 ? 'vec2 z = offset; vec2 C = x;' : 'vec2 C = offset; vec2 z = x;';
    const selectedColoringPath = coloringFunctionPaths[sel];

    try{
        const [mainTemplate, commonFunctions, coloringFunction] = await Promise.all([
            fetch('./src/glsl/main.glsl').then(response => response.text()),
            fetch('./src/glsl/Common.glsl').then(response => response.text()),
            fetch(selectedColoringPath).then(response => response.text())
        ]);
        
        const finalShader = mainTemplate
            .replace('__COMMON_FUNCTIONS__', commonFunctions)
            .replace('__COLORING_FUNCTION__', coloringFunction)
            .replace('__SELECT_PART__', select_part)
            .replace('__GLSL_EXPRESSION__', glslExpression);
        console.log('z = ' + glslExpression);
        
        return finalShader;

    }catch(e){
        console.error('シェーダファイルの読み込みに失敗しました:', error);
        alert('シェーダの構築に失敗しました。');
    }
}
