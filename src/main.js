import { Renderer } from './renderer.js';
import { Controls } from './controls.js';


const SyugoMode = [
    'MON',
    'Juri'
]

const dataElm = document.getElementById('datas');


function formatNumberWithoutRounding(number) {
    let parts = number.toString().split('.'); // 小数点で分割
    if (parts.length === 1) {
        return parts[0] + '.0'; // 整数なら「.0」を付加
    }
    return number;
}

const c = document.getElementById('canvas');

let cw, ch, run = true, eCheck;
let startTime, time = 0.0, pretimer = 0;
let running = false;
let animationId;

const offsetRelm = document.getElementById('zr');
const offsetIelm = document.getElementById('zi');
const fpsCounter = document.getElementById('fpsCounter');

const renderer = new Renderer(c);

function init() {

    if (running) {
        cancelAnimationFrame(animationId);
        running = false;
        console.log("stop");
    }


    let ww = window.innerWidth;
    let wh = window.innerHeight;

    wh -= 80;

    let canSize = 1024;
    if (wh < ww) {
        canSize = wh;
    } else {
        canSize = ww;
    }

    // cw = c.width;
    // ch = c.height;
    cw = canSize; ch = canSize;
    c.width = cw; c.height = ch;

    Controls.cw = cw;
    Controls.ch = ch;

    eCheck = document.getElementById('check');

    eCheck.addEventListener('change', checkChange, true);


    const selectedRadio = document.querySelector('input[name="choice"]:checked');
    let choise = 0;
    SyugoMode.forEach((element, index) => {
        if (element === selectedRadio.value) {
            choise = index;
        }
    });

    const mode = choise;

    const userInput = document.getElementById('fanc').value + " ";

    const coloring = Number(document.getElementById('coloring').value);

    renderer.resetShader(userInput, mode, coloring);


    startTime = new Date().getTime();

    animationId = requestAnimationFrame(render);
    running = true;

    console.log("start", animationId);
}
window.onload = init();

function render() {
    if (!run || !running) return;

    time = (new Date().getTime() - startTime) * 0.001;

    const zr = formatNumberWithoutRounding(Number(offsetRelm.value));
    const zi = formatNumberWithoutRounding(Number(offsetIelm.value));


    const updatedUniformData = new Float32Array([
        Controls.mx,           // mouse.x
        Controls.my,           // mouse.y
        cw,  // resolution.x
        ch, // resolution.y
        zr,           // offset.x
        zi,           // offset.y
        time,   // time
        Controls.zoom,           // zomm
    ]);
    renderer.render(updatedUniformData);


    dataElm.innerText = "position :" + Controls.mx + " , " + Controls.my + "\n";
    dataElm.innerText += "zoom: " + Controls.zoom + "\n";
    fpsCounter.innerText = `FPS: ${Math.round(1 / (time - pretimer))}`;

    pretimer = time;

    animationId = requestAnimationFrame(render);
}
function checkChange(e) {
    run = e.currentTarget.checked;
    if (run) { startTime = new Date().getTime(); render(); }
}

Controls.init(cw, ch);

if(navigator.userAgentData != null){
  navigator.userAgentData.getHighEntropyValues(['mobile']).then((entropyValues) => {
      if (entropyValues.mobile) {
          Controls.isMobile = true;
          console.log("isMobile");
          document.getElementById('sousa1').innerText = "タッチで操作";
          document.getElementById('sousa2').innerText = "ダブルタップ+上下スワイプでズーム";
      }
  }).catch((error) => {
      console.error('Error getting user agent data:', error);
  })
}


document.getElementById('setFunction').onclick = init;
document.getElementById('clearButton').onclick = Controls.clearPosAndZoom;
