export interface RenderState {
  canvasWidth: number;
  canvasHeight: number;
  offsetX: number; // TS内では常にnumber(double)
  offsetY: number;
  zoom: number;
  mouse: { x: number; y: number };
  time: number;
}

export interface IRenderer {
  initialize(): Promise<void>;
  resize(width: number, height: number): void;

  // シェーダーソースを受け取り更新する
  setShader(shaderSource: string): Promise<void>;

  // 毎フレームの描画
  render(state: RenderState): void;
}
