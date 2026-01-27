// @ts-ignore
import init, {
  get_wgsl_output,
  set_panic_hook,
} from "../../../complex-parser/pkg/complex_parser.js";

import mainTemplate from "../../wgsl/single/main.wgsl?raw";
import commonFunctions from "../../wgsl/single/Common.wgsl?raw";

import timeBased from "../../wgsl/coloring/Time-Based.wgsl?raw";
import sinusoidal from "../../wgsl/coloring/Sinusoidal.wgsl?raw";
import dynamicHue from "../../wgsl/coloring/DynamicHue.wgsl?raw";
import cosineBased from "../../wgsl/coloring/Cosine-Based.wgsl?raw";
import neonGlow from "../../wgsl/coloring/NeonGlow.wgsl?raw";

import { IShaderGenerator } from "../IShaderGenerator";
import { ShaderConfig, FractalMode } from "../ShaderConfig";

export class WgslSingleGenerator implements IShaderGenerator {
  private static initialized = false;
  private coloringShaders: string[] = [
    timeBased,
    sinusoidal,
    dynamicHue,
    cosineBased,
    neonGlow,
  ];

  async initialize(): Promise<void> {
    if (!WgslSingleGenerator.initialized) {
      await init();
      set_panic_hook();
      WgslSingleGenerator.initialized = true;
    }
  }

  async generate(config: ShaderConfig): Promise<string | undefined> {
    await this.initialize();

    // Use Single Precision WGSL output from parser
    const wgslExpression: string = get_wgsl_output(config.userExpression);

    if (wgslExpression.startsWith("Parse Error")) {
      console.error(wgslExpression);
      alert(wgslExpression);
      return undefined;
    }

    // Mode Selection for Single
    // Mandelbrot: z = offset (z0), C = x (pixel)
    // Julia: C = offset (param), z = x (pixel)
    let select_part = "";
    if (config.mode === FractalMode.MANDELBROT) {
      // Logic matching main.wgsl:
      // x is the pixel coordinate (p - m)
      // offset is the parameters passed (ox, oy)
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
        .replace("__WGSL_EXPRESSION__", wgslExpression);

      console.log("WGSL Single z = " + wgslExpression);
      return finalShader;
    } catch (e) {
      console.error("Shader generation failed:", e);
      alert("Shader generation failed.");
      return undefined;
    }
  }
}
