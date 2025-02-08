export class Controls {
    constructor() {
    }

    static isDragging = false;
    static startMousePos = { x: 0, y: 0 };
    static mouseKando = 0.75;
    static mx = 0.5;
    static my = 0.5;
    static zoom = 1;

    static cw = 500;
    static ch = 500;

    static init(cw, ch) {
        Controls.cw = cw;
        Controls.ch = ch;

        window.addEventListener('keydown', function (event) {
            if (event.key === 'j') {
                Controls.zoom *= 1.1;
            }
            if (event.key === 'k') {
                Controls.zoom *= 0.9;
            }
        });
        document.getElementById('canvas').addEventListener('wheel', function (event) {
            if (event.deltaY < 0) {
                Controls.zoom *= 1.1; // 上にスクロールした場合、ズームイン
            } else {
                Controls.zoom *= 0.9; // 下にスクロールした場合、ズームアウト
            }
        });

        document.getElementById('canvas').addEventListener('mousedown', (e) => {
            Controls.isDragging = true;
            Controls.startMousePos = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mousemove', (e) => {
            if (!Controls.isDragging) return;

            const deltaX = e.clientX - Controls.startMousePos.x;
            const deltaY = e.clientY - Controls.startMousePos.y;

            Controls.mx = Math.max(-2, Math.min(3, Controls.mx + deltaX / Controls.cw * Controls.mouseKando * Controls.zoom));
            Controls.my = Math.max(-2, Math.min(3, Controls.my + deltaY / Controls.ch * Controls.mouseKando * Controls.zoom));
            // 現在のマウス位置を更新
            Controls.startMousePos.x = e.clientX;
            Controls.startMousePos.y = e.clientY;
        });

        window.addEventListener('mouseup', () => {
            Controls.isDragging = false;
        });
    }

    static clearPosAndZoom() {
        Controls.mx = 0.5;
        Controls.my = 0.5;
        Controls.zoom = 1;
        console.log("クリアー");
    }
}