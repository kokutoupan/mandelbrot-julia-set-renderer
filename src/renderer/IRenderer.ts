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

  // シェーダーを更新する (WebGPUならパイプライン再構築、WebGLならProgramリンク)
  updateShader(
    userExpression: string,
    mode: number,
    coloringIdx: number,
  ): Promise<void>;

  // 毎フレームの描画
  render(state: RenderState): void;
}
