import { IShaderGenerator } from "./IShaderGenerator";
import { ShaderConfig, ShaderBackend, ShaderPrecision } from "./ShaderConfig";
import { GlslSingleGenerator } from "./generators/GlslSingleGenerator";
import { GlslDoubleGenerator } from "./generators/GlslDoubleGenerator";
import { WgslDoubleGenerator } from "./generators/WgslDoubleGenerator";

export class ShaderFactory {
  private static generators: Map<string, IShaderGenerator> = new Map();

  static async generate(config: ShaderConfig): Promise<string | undefined> {
    const key = `${config.backend}_${config.precision}`;

    let generator = this.generators.get(key);
    if (!generator) {
      generator = this.CreateGenerator(config.backend, config.precision);
      this.generators.set(key, generator);
    }

    return generator.generate(config);
  }

  private static CreateGenerator(
    backend: ShaderBackend,
    precision: ShaderPrecision,
  ): IShaderGenerator {
    if (backend === ShaderBackend.GLSL) {
      if (precision === ShaderPrecision.SINGLE) {
        return new GlslSingleGenerator();
      }
      if (precision === ShaderPrecision.DOUBLE) {
        return new GlslDoubleGenerator();
      }
    }

    if (backend === ShaderBackend.WGSL) {
      if (precision === ShaderPrecision.DOUBLE) {
        return new WgslDoubleGenerator();
      }
    }

    throw new Error(
      `Unsupported shader configuration: ${backend} - ${precision}`,
    );
  }
}
