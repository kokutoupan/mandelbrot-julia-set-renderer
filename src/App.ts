import { Renderer } from "./renderer";
import { InputManager } from "./InputManager";
import { UIManager } from "./UIManager";
import { expressionToShader } from "./expressionShader";

/**
 * Main Application Class
 */
export class App {
  uiManager: UIManager;
  inputManager: InputManager;
  renderer: Renderer;
  animationId: number | null;
  isRunning: boolean;
  startTime: number;
  lastFrameTime: number;
  SYUGO_MODE: string[];

  constructor() {
    console.log("App constructor init");

    this.uiManager = new UIManager();
    this.inputManager = new InputManager(this.uiManager.canvas);
    this.renderer = new Renderer(this.uiManager.canvas);

    // State
    this.animationId = null;
    this.isRunning = false;
    this.startTime = 0;
    this.lastFrameTime = 0;

    // Constants can be here or in a config
    this.SYUGO_MODE = ["MON", "Juri"];
  }

  init() {
    console.log("App init");

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

    this.uiManager.canvas.width = size;
    this.uiManager.canvas.height = size;

    this.inputManager.updateDimensions(size, size);

    console.log(`resize: width=${size}, height=${size}`);

    // isReady check was in original, but renderer doesn't expose it explicitly. redundant?
    this.reset();
  }

  async reset() {
    this.stopAnimation();

    const settings = this.uiManager.getFunctionSettings();
    const userInput = settings.func; // already added space in UIManager? yes.
    const mode = settings.mode;
    const coloring = settings.coloring;

    const fs = await expressionToShader(userInput, mode, coloring);

    if (fs == null) return;

    this.renderer.resetShader(fs);

    if (this.uiManager.elements.runCheckbox.checked) {
      this.startAnimation();
    }

    console.log(
      `reset: mode=${mode}, userInput=${userInput}, coloring=${coloring}`,
    );
  }

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

    const uniformData = this.inputManager.getUniformData(
      this.uiManager.canvas.width,
      this.uiManager.canvas.height,
      offsets.x,
      offsets.y,
      currentTime,
    );

    this.renderer.render(uniformData);

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
