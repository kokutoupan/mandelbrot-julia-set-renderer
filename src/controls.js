export class Controls {
    constructor() {}

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

        const canvas = document.getElementById('canvas');

        canvas.addEventListener('wheel', function (event) {
            event.preventDefault();
            Controls.zoom *= event.deltaY < 0 ? 1.1 : 0.9;
        });

        canvas.addEventListener('mousedown', (e) => {
            Controls.isDragging = true;
            Controls.startMousePos = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mousemove', (e) => {
            if (!Controls.isDragging) return;
            Controls.handleMove(e.clientX, e.clientY);
        });

        window.addEventListener('mouseup', () => {
            Controls.isDragging = false;
        });

        // スマホ用のタッチイベント
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                Controls.isDragging = true;
                Controls.startMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        });

        canvas.addEventListener('touchmove', (e) => {
            if (!Controls.isDragging || e.touches.length !== 1) return;
            Controls.handleMove(e.touches[0].clientX, e.touches[0].clientY);
            e.preventDefault();
        });

        canvas.addEventListener('touchend', () => {
            Controls.isDragging = false;
        });

        canvas.addEventListener('gesturestart', (e) => {
            e.preventDefault();
        });

        canvas.addEventListener('gesturechange', (e) => {
            Controls.zoom *= e.scale > 1 ? 1.1 : 0.9;
            e.preventDefault();
        });
    }

    static handleMove(clientX, clientY) {
        const deltaX = clientX - Controls.startMousePos.x;
        const deltaY = clientY - Controls.startMousePos.y;

        Controls.mx = Math.max(-2, Math.min(3, Controls.mx + deltaX / Controls.cw * Controls.mouseKando * Controls.zoom));
        Controls.my = Math.max(-2, Math.min(3, Controls.my + deltaY / Controls.ch * Controls.mouseKando * Controls.zoom));

        Controls.startMousePos.x = clientX;
        Controls.startMousePos.y = clientY;
    }

    static clearPosAndZoom() {
        Controls.mx = 0.5;
        Controls.my = 0.5;
        Controls.zoom = 1;
        console.log("クリアー");
    }
}
