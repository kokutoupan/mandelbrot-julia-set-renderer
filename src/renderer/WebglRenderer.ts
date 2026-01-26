import { IRenderer, RenderState } from "./IRenderer";
import { ShaderPrecision } from "../shader/ShaderConfig";

export class WebGLRenderer implements IRenderer {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext | null;
  vs: WebGLShader | undefined;
  vPosition: WebGLBuffer | null = null;
  vIndex: WebGLBuffer | null = null;
  ubo: WebGLBuffer | null = null;
  uboBlockIndex: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl2");
    if (!this.gl) {
      console.error("WebGL2 is not supported in your browser");
    }
  }

  async initialize(): Promise<void> {
    if (!this.gl) return;

    this.vs = this.createVertexShader();
    const position = [
      -1.0, 1.0, 0.0, 1.0, 1.0, 0.0, -1.0, -1.0, 0.0, 1.0, -1.0, 0.0,
    ];
    const index = [0, 2, 1, 1, 2, 3];
    this.vPosition = this.createVbo(position);
    this.vIndex = this.createIbo(index);

    this.ubo = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.ubo);
    this.gl.bufferData(this.gl.UNIFORM_BUFFER, 8 * 4 * 4, this.gl.DYNAMIC_DRAW);
  }

  resize(width: number, height: number): void {
    this.gl?.viewport(0, 0, width, height);
  }

  // 精度状態
  precision: ShaderPrecision = ShaderPrecision.SINGLE;

  // Changed from updateShader to setShader
  async setShader(shaderSource: string): Promise<void> {
    this._resetShader(shaderSource);
  }

  setPrecision(precision: ShaderPrecision): void {
    this.precision = precision;
  }

  render(state: RenderState): void {
    const gl = this.gl;
    if (!gl) return;

    let data: Float32Array;

    if (this.precision === ShaderPrecision.DOUBLE) {
      // Double Precision Packing
      // Needs to match main.glsl (Double) layout
      // mouse_x (vec2), mouse_y (vec2), resolution (vec2), offset_x (vec2), offset_y (vec2), zoom (vec2), time (float)

      const [mx_hi, mx_lo] = this.splitDouble(state.mouse.x);
      const [my_hi, my_lo] = this.splitDouble(state.mouse.y);
      const [ox_hi, ox_lo] = this.splitDouble(state.offsetX);
      const [oy_hi, oy_lo] = this.splitDouble(state.offsetY);
      const [zm_hi, zm_lo] = this.splitDouble(state.zoom);

      data = new Float32Array([
        mx_hi,
        mx_lo,
        my_hi,
        my_lo,
        state.canvasWidth,
        state.canvasHeight,
        ox_hi,
        ox_lo,
        oy_hi,
        oy_lo,
        zm_hi,
        zm_lo,
        state.time,
        0.0,
        0.0,
        0.0, // padding to 64 bytes (16 floats) just to be aligned
      ]);
    } else {
      // Single Precision Packing
      data = new Float32Array([
        state.mouse.x,
        state.mouse.y,
        state.canvasWidth,
        state.canvasHeight,
        state.offsetX,
        state.offsetY,
        state.time,
        state.zoom,
      ]);
    }

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.ubo);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, data);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    gl.flush();
  }

  private splitDouble(val: number): [number, number] {
    const hi = Math.fround(val);
    const lo = Math.fround(val - hi);
    return [hi, lo];
  }

  // --- Internal Helper Methods ---

  private _resetShader(fs: string) {
    console.log("resetShader");
    const gl = this.gl;
    if (!gl || !this.vs) return;

    const fragmentShader = this.createFragmentShader(fs);
    if (!fragmentShader) return;

    const prg = this.createProgram(this.vs, fragmentShader);
    if (!prg) return;

    const vAttLocation = gl.getAttribLocation(prg, "position");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vPosition);
    gl.enableVertexAttribArray(vAttLocation);
    gl.vertexAttribPointer(vAttLocation, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vIndex);

    this.uboBlockIndex = gl.getUniformBlockIndex(prg, "ShaderData");
    gl.uniformBlockBinding(prg, this.uboBlockIndex, 0);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, this.ubo);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
  }

  private createVbo(data: number[]) {
    const gl = this.gl;
    if (!gl) return null;
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return vbo;
  }

  private createIbo(data: number[]) {
    const gl = this.gl;
    if (!gl) return null;
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Int16Array(data),
      gl.STATIC_DRAW,
    );
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    return ibo;
  }

  private createVertexShader() {
    const gl = this.gl;
    if (!gl) return;

    const vs = `#version 300 es
        in vec3 position;
        void main(void){
            gl_Position = vec4(position, 1.0);
        }`;

    const shader = gl.createShader(gl.VERTEX_SHADER);
    if (!shader) return;

    gl.shaderSource(shader, vs);
    gl.compileShader(shader);

    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      return shader;
    } else {
      console.error(gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  private createFragmentShader(fs: string) {
    const gl = this.gl;
    if (!gl) return;
    const shader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!shader) return;
    gl.shaderSource(shader, fs);
    gl.compileShader(shader);

    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      return shader;
    } else {
      console.error(gl.getShaderInfoLog(shader));
    }

    return shader;
  }

  private createProgram(vs: WebGLShader, fs: WebGLShader) {
    const gl = this.gl;
    if (!gl) return null;

    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.useProgram(program);
      return program;
    } else {
      return null;
    }
  }
}
