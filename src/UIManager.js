export class UIManager {
    constructor() {
        this.elements = {
            canvas: document.getElementById('canvas'),
            dataDisplay: document.getElementById('datas'),
            offsetR: document.getElementById('zr'),
            offsetI: document.getElementById('zi'),
            fpsCounter: document.getElementById('fpsCounter'),
            runCheckbox: document.getElementById('check'),
            functionInput: document.getElementById('fanc'),
            coloringSelect: document.getElementById('coloring'),
            setFunctionButton: document.getElementById('setFunction'),
            clearButton: document.getElementById('clearButton'),
            shareButton: document.getElementById('shareButton'),
            touchInfo1: document.getElementById('sousa1'),
            touchInfo2: document.getElementById('sousa2'),
            radioForm: document.getElementById('radioForm')
        };
    }

    get canvas() {
        return this.elements.canvas;
    }

    bindEvents(callbacks) {
        // Window resize
        window.addEventListener('resize', callbacks.onResize);

        // Button clicks
        this.elements.setFunctionButton.onclick = callbacks.onReset;
        this.elements.clearButton.onclick = callbacks.onClear;
        this.elements.shareButton.onclick = () => this.generateShareLink(callbacks.getInputState());

        // Inputs
        this.elements.runCheckbox.addEventListener('change', (e) => callbacks.onToggleAnimation(e.currentTarget.checked));
        this.elements.offsetR.addEventListener('input', callbacks.onOffsetChange);
        this.elements.offsetI.addEventListener('input', callbacks.onOffsetChange);
    }

    getOffsets() {
        return {
            x: Number(this.elements.offsetR.value),
            y: Number(this.elements.offsetI.value)
        };
    }

    setOffsets(x, y) {
        if (x !== undefined) this.elements.offsetR.value = x;
        if (y !== undefined) this.elements.offsetI.value = y;
    }

    getFunctionSettings() {
        const selectedRadio = document.querySelector('input[name="choice"]:checked');
        const modeValue = selectedRadio ? selectedRadio.value : 'MON';
        // SYUGO_MODE = ['MON', 'Juri']; map to index
        const mode = modeValue === 'MON' ? 0 : 1;
        
        return {
            mode,
            modeValue,
            func: this.elements.functionInput.value + " ",
            coloring: Number(this.elements.coloringSelect.value)
        };
    }

    updateMobileInfo() {
         this.elements.touchInfo1.innerText = "タッチで操作";
         this.elements.touchInfo2.innerText = "ダブルタップ+上下スワイプでズーム";
    }

    updateInfo(mx, my, zoom) {
        const posText = `Position: (${mx.toFixed(4)}, ${my.toFixed(4)})`;
        const zoomText = `Zoom: ${zoom.toFixed(2)}`;
        this.elements.dataDisplay.innerText = `${posText} | ${zoomText}`;
    }

    updateFPS(fps) {
        this.elements.fpsCounter.innerText = `FPS: ${Math.round(fps)}`;
    }

    generateShareLink(currentState) {
        const params = new URLSearchParams();
        const settings = this.getFunctionSettings();
        const offsets = this.getOffsets();

        params.set('mode', settings.modeValue);
        params.set('fanc', this.elements.functionInput.value);
        params.set('coloring', this.elements.coloringSelect.value);
        params.set('offsetR', offsets.x);
        params.set('offsetI', offsets.y);

        const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
        
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('共有リンクをクリップボードにコピーしました！');
        }, () => {
            alert('コピーに失敗しました。');
        });
    }

    loadStateFromUrl() {
        const params = new URLSearchParams(window.location.search);
        
        const mode = params.get('mode');
        if (mode) {
             const radio = document.querySelector(`input[name="choice"][value="${mode}"]`);
             if (radio) radio.checked = true;
        }

        const fanc = params.get('fanc');
        if (fanc) this.elements.functionInput.value = fanc;

        const coloring = params.get('coloring');
        if (coloring) this.elements.coloringSelect.value = coloring;

        const offsetR = params.get('offsetR');
        const offsetI = params.get('offsetI');
        this.setOffsets(offsetR, offsetI);
    }
}
