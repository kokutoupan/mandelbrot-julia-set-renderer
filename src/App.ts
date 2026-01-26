import { WebGLRenderer } from "./renderer/WebglRenderer";
import { InputManager } from "./InputManager";
import { UIManager } from "./UIManager";
import { IRenderer } from "./renderer/IRenderer";

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
    this.renderer = new WebGLRenderer(this.uiManager.canvas);

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
    ); // roughly

    // 2. Bind UI events
    this.uiManager.bindEvents({
      onResize: () => this.resizeCanvas(),
      onReset: () => this.reset(),
      onClear: () => this.inputManager.reset(),
      onToggleAnimation: (checked: boolean) => this.toggleAnimation(checked),
      onOffsetChange: () => {
        /* Offsets are read directly when needed, or we can sync here if strict state needed */
      },
    });

    // 3. Mobile check
    this.detectMobile();

    // 4. Initial Resize & Render
    this.resizeCanvas();
    this.reset();
  }

  // ... detectMobile ...
  async detectMobile() {
    if (navigator.userAgentData?.getHighEntropyValues) {
      try {
        const entropyValues =
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
    const wh = window.innerHeight - 80; // UI_OFFSET_HEIGHT
    const size = Math.min(ww, wh, 1024);

    this.renderer.resize(size, size);

    // Canvas size is also set in UIManager?
    // Wait, WebGLRenderer resize might update canvas.width/height too or just viewport.
    // In current implementation step 188, WebGLRenderer only updates viewport!
    // But UIManager holds the canvas reference.
    // I should probably ensure canvas dimensions are updated.
    // UIManager.ts has no method to resize canvas, but it exposes .canvas getter.
    this.uiManager.canvas.width = size;
    this.uiManager.canvas.height = size;

    this.inputManager.updateDimensions(size, size);

    console.log(`resize: width=${size}, height=${size}`);

    // In previous code, we called reset().
    // If shader depends on screen size? No, usually uniforms.
    // But let's call reset() to be safe if desired, or just trigger render.
    // The previous code had: if (this.renderer.isReady || true) this.reset();

    // If just resizing, we don't necessarily need to recompile shader.
    // Just rendering next frame is enough if state is updated.
    this.reset();
  }

  async reset() {
    this.stopAnimation();

    const settings = this.uiManager.getFunctionSettings();
    const userInput = settings.func;
    const mode = settings.mode;
    const coloring = settings.coloring;

    await this.renderer.updateShader(userInput, mode, coloring);

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

    // Construct RenderState
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
