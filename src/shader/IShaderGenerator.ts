import { ShaderConfig } from "./ShaderConfig";

export interface IShaderGenerator {
  generate(config: ShaderConfig): Promise<string | undefined>;
}
