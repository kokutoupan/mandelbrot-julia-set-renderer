// @ts-ignore
import init, {
  get_wgsl_output_dd,
  set_panic_hook,
} from "../../../complex-parser/pkg/complex_parser.js";

import mainTemplate from "../../wgsl/double/main.wgsl?raw";
import commonFunctions from "../../wgsl/double/Common.wgsl?raw";

import timeBased from "../../wgsl/coloring/Time-Based.wgsl?raw";
import sinusoidal from "../../wgsl/coloring/Sinusoidal.wgsl?raw";
import dynamicHue from "../../wgsl/coloring/DynamicHue.wgsl?raw";
import cosineBased from "../../wgsl/coloring/Cosine-Based.wgsl?raw";
import neonGlow from "../../wgsl/coloring/NeonGlow.wgsl?raw";

import { IShaderGenerator } from "../IShaderGenerator";
import { ShaderConfig, FractalMode } from "../ShaderConfig";

export class WgslDoubleGenerator implements IShaderGenerator {
  private static initialized = false;
  private coloringShaders: string[] = [
    timeBased,
    sinusoidal,
    dynamicHue,
    cosineBased,
    neonGlow,
  ];

  async initialize(): Promise<void> {
    if (!WgslDoubleGenerator.initialized) {
      await init();
      set_panic_hook();
      WgslDoubleGenerator.initialized = true;
    }
  }

  async generate(config: ShaderConfig): Promise<string | undefined> {
    await this.initialize();

    // Use Double-Double WGSL output from parser
    const wgslExpression: string = get_wgsl_output_dd(config.userExpression);

    if (wgslExpression.startsWith("Parse Error")) {
      console.error(wgslExpression);
      alert(wgslExpression);
      return undefined;
    }

    // Mode Selection for Double
    // Mandelbrot: z = offset (z0), C = x (pixel)
    // Julia: C = offset (param), z = x (pixel)
    // In main.wgsl we have:
    // var z: mat2x2<f32>;
    // var C: mat2x2<f32>;
    // let x = ...;
    // let offset_val = ...;

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
        .replace("__WGSL_EXPRESSION__", wgslExpression);

      console.log("WGSL z = " + wgslExpression);
      return finalShader;
    } catch (e) {
      console.error("Shader generation failed:", e);
      alert("Shader generation failed.");
      return undefined;
    }
  }
}
