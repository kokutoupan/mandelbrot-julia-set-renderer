import { IRenderer, RenderState } from "./IRenderer";
import { ShaderPrecision } from "../shader/ShaderConfig";

export class WebGPURenderer implements IRenderer {
  canvas: HTMLCanvasElement;
  adapter: GPUAdapter | null = null;
  device: GPUDevice | null = null;
  context: GPUCanvasContext | null = null;
  pipeline: GPURenderPipeline | null = null;
  uniformBuffer: GPUBuffer | null = null;
  bindGroup: GPUBindGroup | null = null;
  precision: ShaderPrecision = ShaderPrecision.DOUBLE; // Default

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async initialize(): Promise<void> {
    // @ts-ignore
    if (!navigator.gpu) {
      console.error("WebGPU not supported in this browser.");
      return;
    }

    // @ts-ignore
    this.adapter = await navigator.gpu.requestAdapter();
    if (!this.adapter) {
      console.error("No appropriate GPUAdapter found.");
      return;
    }

    this.device = await this.adapter.requestDevice();
    this.context = this.canvas.getContext("webgpu");

    if (!this.context || !this.device) {
      console.error("Failed to initialize WebGPU context/device");
      return;
    }

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: this.device,
      format: presentationFormat,
      alphaMode: "premultiplied",
    });

    // Create Uniform Buffer (initial size for Double layout: 13 floats + padding = 64 bytes)
    this.uniformBuffer = this.device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  resize(_width: number, _height: number): void {
    // WebGPU context automatically resizes with canvas, but we might need to reconfigure if we want explicit size
    // Usually handled by UI/CSS + internal canvas size.
    // App.ts sets canvas.width/height which updates the drawable buffer size.
  }

  setPrecision(precision: ShaderPrecision): void {
    this.precision = precision;
  }

  async setShader(shaderSource: string): Promise<void> {
    if (!this.device || !this.context) return;

    const shaderModule = this.device.createShaderModule({
      code: shaderSource,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    this.pipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: this.device.createShaderModule({
          code: `
            @vertex
            fn main(@builtin(vertex_index) VertexIndex: u32) -> @builtin(position) vec4<f32> {
                var pos = array<vec2<f32>, 4>(
                    vec2<f32>(-1.0, -1.0),
                    vec2<f32>( 1.0, -1.0),
                    vec2<f32>(-1.0,  1.0),
                    vec2<f32>( 1.0,  1.0)
                );
                return vec4<f32>(pos[VertexIndex], 0.0, 1.0);
            }
            `,
        }),
        entryPoint: "main",
      },
      fragment: {
        module: shaderModule,
        entryPoint: "main",
        targets: [
          {
            format: presentationFormat,
          },
        ],
      },
      primitive: {
        topology: "triangle-strip",
      },
    });

    this.bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.uniformBuffer!,
          },
        },
      ],
    });
  }

  render(state: RenderState): void {
    if (!this.device || !this.context || !this.pipeline || !this.bindGroup)
      return;

    // Pack Uniforms
    // Layout: mx_hi, mx_lo, my_hi, my_lo, res_x, res_y, ox_hi, ox_lo, oy_hi, oy_lo, zm_hi, zm_lo, time
    // 13 floats.

    let data: Float32Array;

    // For now assuming Double layout because that's what main.wgsl expects
    const [mx_hi, mx_lo] = this.splitDouble(state.mouse.x);
    const [my_hi, my_lo] = this.splitDouble(state.mouse.y);
    const [ox_hi, ox_lo] = this.splitDouble(state.offsetX); // RenderState.offsetX is number (double)
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
      0.0, // Padding to 16 Floats (64 bytes)
    ]);

    this.device.queue.writeBuffer(this.uniformBuffer!, 0, data as any);

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.draw(4);
    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }

  private splitDouble(val: number): [number, number] {
    const hi = Math.fround(val);
    const lo = Math.fround(val - hi);
    return [hi, lo];
  }
}
