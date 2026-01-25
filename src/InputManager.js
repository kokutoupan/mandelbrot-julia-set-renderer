export class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        
        // State
        this.isDragging = false;
        this.startMousePos = { x: 0, y: 0 };
        this.mouseSensitivity = 0.75; // Renamed from mouseKando
        this.mx = 0.5;
        this.my = 0.5;
        this.zoom = 1;
        
        this.isDoubleTap = false; // Renamed from isDobbleTap
        this.tapTime = 0;
        
        this.cw = canvas.width;
        this.ch = canvas.height;

        this._setupEventListeners();
    }

    updateDimensions(width, height) {
        this.cw = width;
        this.ch = height;
    }

    reset() {
        this.mx = 0.5;
        this.my = 0.5;
        this.zoom = 1;
        console.log("Input reset");
    }

    getUniformData(canvasWidth, canvasHeight, offsetX, offsetY, currentTime) {
        return new Float32Array([
            this.mx,
            this.my,
            canvasWidth,
            canvasHeight,
            offsetX,
            offsetY,
            currentTime,
            this.zoom,
        ]);
    }

    _setupEventListeners() {
        document.addEventListener('keydown', (e) => this._handleKeyDown(e));
        
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.zoom *= e.deltaY < 0 ? 1.1 : 0.9;
        }, { passive: false });

        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.startMousePos = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            this._handleMove(e.clientX, e.clientY);
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this._handleTouchStart(e), { passive: true });
        this.canvas.addEventListener('touchmove', (e) => this._handleTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', () => {
            this.isDragging = false;
            this.isDoubleTap = false;
        });
    }

    _handleKeyDown(e) {
        const inputTags = ['INPUT', 'TEXTAREA', 'SELECT'];
        if (inputTags.includes(e.target.tagName)) return;

        switch(e.key) {
            case 'ArrowLeft':  this.mx += 0.1 * this.zoom; break;
            case 'ArrowRight': this.mx -= 0.1 * this.zoom; break;
            case 'ArrowUp':    this.my += 0.1 * this.zoom; break;
            case 'ArrowDown':  this.my -= 0.1 * this.zoom; break;
            case 'j':          this.zoom *= 1.1; break;
            case 'k':          this.zoom *= 0.9; break;
        }
    }

    _handleTouchStart(e) {
        if (e.touches.length === 1) {
            this.isDragging = true;
            this.startMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };

            const now = new Date().getTime();
            if (now - this.tapTime < 500) {
                this.isDoubleTap = true;
            }
            this.tapTime = now;
        }
    }

    _handleTouchMove(e) {
        if (!this.isDragging || e.touches.length !== 1) return;
        
        if (this.isDoubleTap) {
            this._handleZoom(e.touches[0].clientX, e.touches[0].clientY);
        } else {
            this._handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }
        
        if (e.cancelable) e.preventDefault();
    }

    _handleMove(clientX, clientY) {
        const deltaX = clientX - this.startMousePos.x;
        const deltaY = clientY - this.startMousePos.y;

        this.mx = Math.max(-2, Math.min(3, this.mx + deltaX / this.cw * this.mouseSensitivity * this.zoom));
        this.my = Math.max(-2, Math.min(3, this.my + deltaY / this.ch * this.mouseSensitivity * this.zoom));

        this.startMousePos.x = clientX;
        this.startMousePos.y = clientY;
    }

    _handleZoom(clientX, clientY) {
        const deltaY = clientY - this.startMousePos.y;
        
        // Exponential zoom based on drag distance
        this.zoom = this.zoom * Math.pow(1.01, deltaY);

        this.startMousePos.x = clientX;
        this.startMousePos.y = clientY;
    }
}
