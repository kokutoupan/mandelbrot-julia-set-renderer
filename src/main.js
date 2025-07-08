import { Renderer } from './renderer.js';
import { Controls } from './controls.js';

/**
 * アプリケーション全体を管理するクラス
 */
class FractalApp {
    /**
     * @constructor
     */
    constructor() {
        console.log("constructor init");
        // --- 定数 ---
        this.SYUGO_MODE = ['MON', 'Juri'];
        this.UI_OFFSET_HEIGHT = 80;

        // --- DOM要素の取得 ---
        this.canvas = document.getElementById('canvas');
        this.dataElm = document.getElementById('datas');
        this.offsetRElm = document.getElementById('zr');
        this.offsetIElm = document.getElementById('zi');
        this.fpsCounter = document.getElementById('fpsCounter');
        this.runCheckbox = document.getElementById('check');
        this.functionInput = document.getElementById('fanc');
        this.coloringSelect = document.getElementById('coloring');
        this.setFunctionButton = document.getElementById('setFunction');
        this.clearButton = document.getElementById('clearButton');
        this.shareButton = document.getElementById('shareButton'); // この行を追加
        this.sousa1Elm = document.getElementById('sousa1');
        this.sousa2Elm = document.getElementById('sousa2');

        // --- レンダラー ---
        this.renderer = new Renderer(this.canvas);

        // オフセット値をクラスのプロパティとして保持
        this.offsetX = 0.0;
        this.offsetY = 0.0;

        // --- 状態管理用プロパティ ---
        this.animationId = null;
        this.isRunning = false;
        this.startTime = 0;
        this.lastFrameTime = 0;
    }

    /**
     * アプリケーションの初期化
     */
    init() {
        console.log("init");
        this.loadStateFromUrl();
        this.updateOffsets();
        this.setupEventListeners();
        this.detectMobile();
        this.resizeCanvas(); // 初回リサイズを実行
        Controls.init(this.canvas.width, this.canvas.height);
        this.reset();
    }

    /**
     * すべてのイベントリスナーを設定する
     */
    setupEventListeners() {
        // ウィンドウがリサイズされたら、キャンバスサイズも変更する
        window.addEventListener('resize', () => this.resizeCanvas());

        this.setFunctionButton.onclick = () => this.reset();
        this.clearButton.onclick = () => Controls.clearPosAndZoom();
        this.shareButton.onclick = () => this.generateShareLink();
        this.runCheckbox.addEventListener('change', (e) => this.toggleAnimation(e.currentTarget.checked));
        this.offsetRElm.addEventListener('input', () => this.updateOffsets());
        this.offsetIElm.addEventListener('input', () => this.updateOffsets());
    }

    /**
     * 入力欄からオフセット値を取得し、プロパティを更新する
     */
    updateOffsets() {
        this.offsetX = Number(this.offsetRElm.value);
        this.offsetY = Number(this.offsetIElm.value);
    }

    /**
     * モバイルデバイスかどうかを判定し、UIのテキストを更新する
     */
    async detectMobile() {
        if (navigator.userAgentData?.getHighEntropyValues) {
            try {
                const entropyValues = await navigator.userAgentData.getHighEntropyValues(['mobile']);
                if (entropyValues.mobile) {
                    Controls.isMobile = true;
                    console.log("isMobile");
                    this.sousa1Elm.innerText = "タッチで操作";
                    this.sousa2Elm.innerText = "ダブルタップ+上下スワイプでズーム";
                }
            } catch (error) {
                console.error('Error getting user agent data:', error);
            }
        }
    }

    /**
     * キャンバスのサイズをウィンドウに合わせて調整する
     */
    resizeCanvas() {
        const ww = window.innerWidth;
        const wh = window.innerHeight - this.UI_OFFSET_HEIGHT;
        const size = Math.min(ww, wh, 1024); // 画面サイズと最大サイズ(1024)から最小値を選択

        this.canvas.width = size;
        this.canvas.height = size;

        Controls.cw = size;
        Controls.ch = size;

        // リサイズ後は再描画が必要なため、シェーダーをリセット
        if (this.renderer.isReady) {
            this.reset();
        }
    }

    /**
     * アニメーションをリセットし、新しい設定で再開する
     */
    reset() {
        this.stopAnimation();

        const selectedRadio = document.querySelector('input[name="choice"]:checked');
        const mode = this.SYUGO_MODE.indexOf(selectedRadio.value);
        const userInput = this.functionInput.value + " ";
        const coloring = Number(this.coloringSelect.value);

        this.renderer.resetShader(userInput, mode, coloring);

        // チェックボックスがONの場合のみアニメーションを開始
        if (this.runCheckbox.checked) {
            this.startAnimation();
        }

        console.log(`reset: mode=${mode}, userInput=${userInput}, coloring=${coloring}`);
    }

    /**
     * アニメーションを開始する
     */
    startAnimation() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.startTime = Date.now();
        this.lastFrameTime = 0;
        console.log("Animation started");
        this.render(); // 最初のフレームを描画
    }

    /**
     * アニメーションを停止する
     */
    stopAnimation() {
        if (!this.isRunning) return;
        cancelAnimationFrame(this.animationId);
        this.isRunning = false;
        this.animationId = null;
        console.log("Animation stopped");
    }

    /**
     * アニメーションの実行/停止を切り替える
     * @param {boolean} shouldRun - 実行するかどうか
     */
    toggleAnimation(shouldRun) {
        if (shouldRun) {
            this.startAnimation();
        } else {
            this.stopAnimation();
        }
    }

    /**
     * 描画ループ処理
     */
    render() {
        if (!this.isRunning) return;

        const currentTime = (Date.now() - this.startTime) * 0.001; // 秒単位に変換

        // GPUに送るデータを更新
        const updatedUniformData = new Float32Array([
            Controls.mx,
            Controls.my,
            this.canvas.width,
            this.canvas.height,
            this.offsetX,
            this.offsetY,
            currentTime,
            Controls.zoom,
        ]);

        this.renderer.render(updatedUniformData);
        this.updateUI(currentTime);

        this.lastFrameTime = currentTime;

        // 次のフレームを要求
        this.animationId = requestAnimationFrame(() => this.render());
    }

    /**
     * UI要素（情報表示テキストやFPS）を更新する
     * @param {number} currentTime - 現在の時間（秒）
     */
    updateUI(currentTime) {
        this.dataElm.innerText = `position: ${Controls.mx}, ${Controls.my}\nzoom: ${Controls.zoom}`;

        const deltaTime = currentTime - this.lastFrameTime;
        if (deltaTime > 0) {
            const fps = 1 / deltaTime;
            this.fpsCounter.innerText = `FPS: ${Math.round(fps)}`;
        }
    }
      
    /**
     * 現在の設定から共有用のURLを生成し、クリップボードにコピーする
     */
    generateShareLink() {
        const params = new URLSearchParams();
        const selectedRadio = document.querySelector('input[name="choice"]:checked');
        
        // パラメータを設定
        params.set('mode', selectedRadio.value);
        params.set('fanc', this.functionInput.value);
        params.set('coloring', this.coloringSelect.value);
        params.set('offsetR', this.offsetRElm.value);
        params.set('offsetI', this.offsetIElm.value);

        // 現在のURLとパラメータを結合
        const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
        
        // クリップボードにコピー
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('共有リンクをクリップボードにコピーしました！');
        }, () => {
            // 失敗した場合
            alert('コピーに失敗しました。');
        });
    }

    /**
     * ページ読み込み時にURLパラメータを読み取り、フォームに反映する
     */
    loadStateFromUrl() {
        const params = new URLSearchParams(window.location.search);

        const mode = params.get('mode');
        const fanc = params.get('fanc');
        const coloring = params.get('coloring');
        const offsetR = params.get('offsetR');
        const offsetI = params.get('offsetI');

        // modeパラメータがあれば、対応するラジオボタンを選択状態にする
        if (mode) {
            const radioToSelect = document.querySelector(`input[name="choice"][value="${mode}"]`);
            if (radioToSelect) {
                radioToSelect.checked = true;
            }
        }

        // fancパラメータがあれば、関数入力欄に値を設定する
        if (fanc) {
            this.functionInput.value = fanc;
        }

        // coloringパラメータがあれば、配色選択に値を設定する
        if (coloring) {
            this.coloringSelect.value = coloring;
        }

        // Realが指定されていたら
        if(offsetR) {
            this.offsetRElm.value = offsetR;
        }
        if(offsetI) {
            this.offsetIElm.value = offsetI;
        }
    }
}

// アプリケーションを初期化する関数を定義
const initializeApp = () => {
    console.log("initializeApp is called"); // 実行確認用
    const app = new FractalApp();
    app.init();
};

// DOMの準備がすでに完了しているかチェック
if (document.readyState === 'loading') {
    // まだ読み込み中の場合は、イベントを待つ
    window.addEventListener('DOMContentLoaded', initializeApp);
} else {
    console.log("DOMContentLoaded");
    // すでに読み込みが完了している場合は、すぐに実行する
    initializeApp();
}
