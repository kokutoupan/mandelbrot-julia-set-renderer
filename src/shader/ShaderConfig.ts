export enum ShaderBackend {
  GLSL = "GLSL",
}

export enum ShaderPrecision {
  SINGLE = "SINGLE",
  DOUBLE = "DOUBLE",
}

export enum FractalMode {
  MANDELBROT = 0,
  JULIA = 1,
}

export interface ShaderConfig {
  backend: ShaderBackend;
  precision: ShaderPrecision;
  mode: FractalMode;
  coloringIdx: number;
  userExpression: string;
}
