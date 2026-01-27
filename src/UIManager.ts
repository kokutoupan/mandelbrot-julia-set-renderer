export interface UIElements {
  canvas: HTMLCanvasElement;
  dataDisplay: HTMLElement;
  offsetR: HTMLInputElement;
  offsetI: HTMLInputElement;
  fpsCounter: HTMLElement;
  runCheckbox: HTMLInputElement;
  functionInput: HTMLInputElement;
  coloringSelect: HTMLSelectElement;
  setFunctionButton: HTMLButtonElement;
  clearButton: HTMLButtonElement;
  shareButton: HTMLButtonElement;
  touchInfo1: HTMLElement;
  touchInfo2: HTMLElement;
  radioForm: HTMLFormElement;
  precisionSelect: HTMLSelectElement;
}

export interface UICallbacks {
  onResize: () => void;
  onReset: () => void;
  onClear: () => void;
  onToggleAnimation: (checked: boolean) => void;
  onOffsetChange: () => void;
}

export class UIManager {
  elements: UIElements;

  constructor() {
    this.elements = {
      canvas: document.getElementById("canvas") as HTMLCanvasElement,
      dataDisplay: document.getElementById("datas") as HTMLElement,
      offsetR: document.getElementById("zr") as HTMLInputElement,
      offsetI: document.getElementById("zi") as HTMLInputElement,
      fpsCounter: document.getElementById("fpsCounter") as HTMLElement,
      runCheckbox: document.getElementById("check") as HTMLInputElement,
      functionInput: document.getElementById("fanc") as HTMLInputElement,
      coloringSelect: document.getElementById("coloring") as HTMLSelectElement,
      setFunctionButton: document.getElementById(
        "setFunction",
      ) as HTMLButtonElement,
      clearButton: document.getElementById("clearButton") as HTMLButtonElement,
      shareButton: document.getElementById("shareButton") as HTMLButtonElement,
      touchInfo1: document.getElementById("sousa1") as HTMLElement,
      touchInfo2: document.getElementById("sousa2") as HTMLElement,
      radioForm: document.getElementById("radioForm") as HTMLFormElement,
      precisionSelect: document.getElementById(
        "precision",
      ) as HTMLSelectElement,
    };
  }

  get canvas(): HTMLCanvasElement {
    return this.elements.canvas;
  }

  bindEvents(callbacks: UICallbacks) {
    // Window resize
    window.addEventListener("resize", callbacks.onResize);

    // Button clicks
    this.elements.setFunctionButton.onclick = callbacks.onReset;
    this.elements.clearButton.onclick = callbacks.onClear;
    this.elements.shareButton.onclick = () => this.generateShareLink();

    // Inputs
    this.elements.runCheckbox.addEventListener("change", (e) =>
      callbacks.onToggleAnimation(
        (e.currentTarget as HTMLInputElement).checked,
      ),
    );
    this.elements.offsetR.addEventListener("input", callbacks.onOffsetChange);
    this.elements.offsetI.addEventListener("input", callbacks.onOffsetChange);
  }

  getOffsets() {
    return {
      x: Number(this.elements.offsetR.value),
      y: Number(this.elements.offsetI.value),
    };
  }

  setOffsets(x: string | null, y: string | null) {
    if (x !== null) this.elements.offsetR.value = x;
    if (y !== null) this.elements.offsetI.value = y;
  }

  getFunctionSettings() {
    const selectedRadio = document.querySelector(
      'input[name="choice"]:checked',
    ) as HTMLInputElement;
    const modeValue = selectedRadio ? selectedRadio.value : "MON";
    // SYUGO_MODE = ['MON', 'Juri']; map to index
    const mode = modeValue === "MON" ? 0 : 1;

    return {
      mode,
      modeValue,
      func: this.elements.functionInput.value + " ",
      coloring: Number(this.elements.coloringSelect.value),
      precision: this.elements.precisionSelect.value,
    };
  }

  updateMobileInfo() {
    this.elements.touchInfo1.innerText = "タッチで操作";
    this.elements.touchInfo2.innerText = "ダブルタップ+上下スワイプでズーム";
  }

  updateInfo(mx: number, my: number, zoom: number) {
    const posText = `Position: (${mx.toFixed(4)}, ${my.toFixed(4)})`;
    const zoomText = `Zoom: ${zoom.toExponential(2)}`;
    this.elements.dataDisplay.innerText = `${posText} | ${zoomText}`;
  }

  updateFPS(fps: number) {
    this.elements.fpsCounter.innerText = `FPS: ${Math.round(fps)}`;
  }

  generateShareLink() {
    const params = new URLSearchParams();
    const settings = this.getFunctionSettings();
    const offsets = this.getOffsets();

    params.set("mode", settings.modeValue);
    params.set("fanc", this.elements.functionInput.value);
    params.set("coloring", this.elements.coloringSelect.value);
    params.set("offsetR", String(offsets.x));
    params.set("offsetI", String(offsets.y));

    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

    navigator.clipboard.writeText(shareUrl).then(
      () => {
        alert("共有リンクをクリップボードにコピーしました！");
      },
      () => {
        alert("コピーに失敗しました。");
      },
    );
  }

  loadStateFromUrl() {
    const params = new URLSearchParams(window.location.search);

    const mode = params.get("mode");
    if (mode) {
      const radio = document.querySelector(
        `input[name="choice"][value="${mode}"]`,
      ) as HTMLInputElement;
      if (radio) radio.checked = true;
    }

    const fanc = params.get("fanc");
    if (fanc) this.elements.functionInput.value = fanc;

    const coloring = params.get("coloring");
    if (coloring) this.elements.coloringSelect.value = coloring;

    const offsetR = params.get("offsetR");
    const offsetI = params.get("offsetI");
    this.setOffsets(offsetR, offsetI);
  }
}
