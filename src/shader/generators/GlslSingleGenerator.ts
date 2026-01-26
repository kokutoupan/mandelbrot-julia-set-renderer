// @ts-ignore
import init, {
  get_glsl_output,
  set_panic_hook,
} from "../../../complex-parser/pkg/complex_parser.js";

import mainTemplate from "../../glsl/single/main.glsl?raw";
import commonFunctions from "../../glsl/single/Common.glsl?raw";
import timeBased from "../../glsl/coloring/Time-Based.glsl?raw";
import sinusoidal from "../../glsl/coloring/Sinusoidal.glsl?raw";
import dynamicHue from "../../glsl/coloring/DynamicHue.glsl?raw";
import cosineBased from "../../glsl/coloring/Cosine-Based.glsl?raw";
import neonGlow from "../../glsl/coloring/NeonGlow.glsl?raw";

import { IShaderGenerator } from "../IShaderGenerator";
import { ShaderConfig, FractalMode } from "../ShaderConfig";

export class GlslSingleGenerator implements IShaderGenerator {
  private static initialized = false;
  private coloringShaders: string[] = [
    timeBased,
    sinusoidal,
    dynamicHue,
    cosineBased,
    neonGlow,
  ];

  async initialize(): Promise<void> {
    if (!GlslSingleGenerator.initialized) {
      await init();
      set_panic_hook();
      GlslSingleGenerator.initialized = true;
    }
  }

  async generate(config: ShaderConfig): Promise<string | undefined> {
    await this.initialize();

    const glslExpression: string = get_glsl_output(config.userExpression);

    if (glslExpression.startsWith("Parse Error")) {
      // In Generator, we should probably return specific error or throw, but for now simple return undefined or let caller handle it?
      // Or keep existing behavior of alerting?
      // Ideally Generator logic shouldn't UI alert.
      // Let's attach the error to the string or just console.error.
      // But original code alerted.
      alert(glslExpression);
      return undefined;
    }

    const select_part =
      config.mode === FractalMode.MANDELBROT
        ? "vec2 z = offset; vec2 C = x;"
        : "vec2 C = offset; vec2 z = x;";

    const coloringFunction = this.coloringShaders[config.coloringIdx];

    try {
      const finalShader = mainTemplate
        .replace("__COMMON_FUNCTIONS__", commonFunctions)
        .replace("__COLORING_FUNCTION__", coloringFunction)
        .replace("__SELECT_PART__", select_part)
        .replace("__GLSL_EXPRESSION__", glslExpression);

      console.log("z = " + glslExpression);
      return finalShader;
    } catch (e) {
      console.error("Shader generation failed:", e);
      alert("Shader generation failed.");
      return undefined;
    }
  }
}
