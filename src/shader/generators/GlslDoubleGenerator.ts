// @ts-ignore
import init, {
  get_glsl_output_dd,
  set_panic_hook,
} from "../../../complex-parser/pkg/complex_parser.js";

import mainTemplate from "../../glsl/double/main.glsl?raw";
import commonFunctions from "../../glsl/double/Common.glsl?raw";

// Reuse coloring shaders from single (float compatible)
import timeBased from "../../glsl/coloring/Time-Based.glsl?raw";
import sinusoidal from "../../glsl/coloring/Sinusoidal.glsl?raw";
import dynamicHue from "../../glsl/coloring/DynamicHue.glsl?raw";
import cosineBased from "../../glsl/coloring/Cosine-Based.glsl?raw";
import neonGlow from "../../glsl/coloring/NeonGlow.glsl?raw";

import { IShaderGenerator } from "../IShaderGenerator";
import { ShaderConfig, FractalMode } from "../ShaderConfig";

export class GlslDoubleGenerator implements IShaderGenerator {
  private static initialized = false;
  private coloringShaders: string[] = [
    timeBased,
    sinusoidal,
    dynamicHue,
    cosineBased,
    neonGlow,
  ];

  async initialize(): Promise<void> {
    if (!GlslDoubleGenerator.initialized) {
      await init();
      set_panic_hook();
      GlslDoubleGenerator.initialized = true;
    }
  }

  async generate(config: ShaderConfig): Promise<string | undefined> {
    await this.initialize();

    const glslExpression: string = get_glsl_output_dd(config.userExpression);

    if (glslExpression.startsWith("Parse Error")) {
      console.error(glslExpression);
      alert(glslExpression);
      return undefined;
    }

    // Mode Selection for Double
    // Mandelbrot: z = offset (z0), C = x (pixel)
    // Julia: C = offset (param), z = x (pixel)
    // In main.glsl we have calculated `x` and `offset_val`.
    // We need to assign them to `z` and `C`.

    let select_part = "";
    if (config.mode === FractalMode.MANDELBROT) {
      select_part = "z = offset_val; C = x;";
    } else {
      select_part = "C = offset_val; z = x;";
    }

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
