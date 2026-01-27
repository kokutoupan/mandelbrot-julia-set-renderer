import { WebGLRenderer } from "./renderer/WebglRenderer";
import { WebGPURenderer } from "./renderer/WebGPURenderer";
import { InputManager } from "./InputManager";
import { UIManager } from "./UIManager";
import { IRenderer } from "./renderer/IRenderer";
import { ShaderFactory } from "./shader/ShaderFactory";
import {
  ShaderConfig,
  ShaderBackend,
  ShaderPrecision,
} from "./shader/ShaderConfig";

/**
 * Main Application Class
 */
export class App {
  uiManager: UIManager;
  inputManager: InputManager;
  renderer: IRenderer;
  animationId: number | null;
  isRunning: boolean;
  startTime: number;
  lastFrameTime: number;
  SYUGO_MODE: string[];

  constructor() {
    console.log("App constructor init");

    this.uiManager = new UIManager();
    this.inputManager = new InputManager(this.uiManager.canvas);

    // @ts-ignore
    if (navigator.gpu) {
      console.log("Using WebGPURenderer");
      this.renderer = new WebGPURenderer(this.uiManager.canvas);
    } else {
      console.log("Using WebGLRenderer");
      this.renderer = new WebGLRenderer(this.uiManager.canvas);
    }

    // State
    this.animationId = null;
    this.isRunning = false;
    this.startTime = 0;
    this.lastFrameTime = 0;

    // Constants can be here or in a config
    this.SYUGO_MODE = ["MON", "Juri"];
  }

  async init() {
    console.log("App init");

    // Initialize Renderer
    await this.renderer.initialize();

    // 1. Load state from URL
    this.uiManager.loadStateFromUrl();
    this.inputManager.updateDimensions(
      window.innerWidth,
      window.innerHeight - 80,
    );

    // 2. Bind UI events
    this.uiManager.bindEvents({
      onResize: () => this.resizeCanvas(),
      onReset: () => this.reset(),
      onClear: () => this.inputManager.reset(),
      onToggleAnimation: (checked: boolean) => this.toggleAnimation(checked),
      onOffsetChange: () => {},
    });

    // 3. Mobile check
    this.detectMobile();

    // 4. Initial Resize & Render
    this.resizeCanvas();
    this.reset();
  }

  // ... detectMobile ...
  async detectMobile() {
    // @ts-ignore
    if (navigator.userAgentData?.getHighEntropyValues) {
      try {
        const entropyValues =
          // @ts-ignore
          await navigator.userAgentData.getHighEntropyValues(["mobile"]);
        if (entropyValues.mobile) {
          console.log("isMobile");
          this.uiManager.updateMobileInfo();
        }
      } catch (error) {
        console.error("Error getting user agent data:", error);
      }
    }
  }

  resizeCanvas() {
    const ww = window.innerWidth;
    const wh = window.innerHeight - 80;
    const size = Math.min(ww, wh, 1024);

    this.renderer.resize(size, size);

    this.uiManager.canvas.width = size;
    this.uiManager.canvas.height = size;

    this.inputManager.updateDimensions(size, size);

    console.log(`resize: width=${size}, height=${size}`);

    this.reset();
  }

  async reset() {
    this.stopAnimation();

    const settings = this.uiManager.getFunctionSettings();
    const userInput = settings.func;
    const mode = settings.mode;
    const coloring = settings.coloring;

    // Determine Backend
    const isWebGPU = this.renderer instanceof WebGPURenderer;
    const backend = isWebGPU ? ShaderBackend.WGSL : ShaderBackend.GLSL;

    // Create ShaderConfig
    const config: ShaderConfig = {
      backend: backend,
      precision: ShaderPrecision.SINGLE,
      mode: mode,
      coloringIdx: coloring,
      userExpression: userInput,
    };

    // Update Renderer Precision
    this.renderer.setPrecision(config.precision);

    // Generate Source
    const fs = await ShaderFactory.generate(config);
    if (!fs) return;

    // Update Renderer
    await this.renderer.setShader(fs);

    if (this.uiManager.elements.runCheckbox.checked) {
      this.startAnimation();
    }

    console.log(
      `reset: mode=${mode}, userInput=${userInput}, coloring=${coloring}`,
    );
  }

  // ... start/stop/toggleAnimation ...
  startAnimation() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startTime = Date.now();
    this.lastFrameTime = 0;
    console.log("Animation started");
    this.render();
  }

  stopAnimation() {
    if (!this.isRunning) return;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.isRunning = false;
    this.animationId = null;
    console.log("Animation stopped");
  }

  toggleAnimation(shouldRun: boolean) {
    if (shouldRun) {
      this.startAnimation();
    } else {
      this.stopAnimation();
    }
  }

  render() {
    if (!this.isRunning) return;

    const currentTime = (Date.now() - this.startTime) * 0.001;

    const offsets = this.uiManager.getOffsets();

    const state = {
      canvasWidth: this.uiManager.canvas.width,
      canvasHeight: this.uiManager.canvas.height,
      offsetX: offsets.x,
      offsetY: offsets.y,
      zoom: this.inputManager.zoom,
      mouse: { x: this.inputManager.mx, y: this.inputManager.my },
      time: currentTime,
    };

    this.renderer.render(state);

    this.uiManager.updateInfo(
      this.inputManager.mx,
      this.inputManager.my,
      this.inputManager.zoom,
    );

    const deltaTime = currentTime - this.lastFrameTime;
    if (deltaTime > 0) {
      this.uiManager.updateFPS(1 / deltaTime);
    }

    this.lastFrameTime = currentTime;
    this.animationId = requestAnimationFrame(() => this.render());
  }
}
