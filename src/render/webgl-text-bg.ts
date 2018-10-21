import { WebGL2, VarKind } from '../render/webgl-utils'
import * as cc from '../core/canvas-container'

export default (webgl: WebGL2) => {
  const rez = {
    canvas: { width: 0, height: 0 },
  }

  const program = webgl.setupProgram({
    quadVertex: VarKind.Attribute,
    cellPosition: VarKind.Attribute,
    cellColor: VarKind.Attribute,
    canvasResolution: VarKind.Uniform,
    cellSize: VarKind.Uniform,
  })

  program.setVertexShader(v => `
    in vec2 ${v.quadVertex};
    in vec2 ${v.cellPosition};
    in vec2 ${v.cellColor};
    uniform vec2 ${v.canvasResolution};
    uniform vec2 ${v.cellSize};

    out vec4 o_cellColor;

    void main() {
      vec2 absolutePixelPosition = ${v.cellPosition} * ${v.cellSize};
      vec2 vertexPosition = absolutePixelPosition + ${v.quadVertex};
      vec2 posFloat = vertexPosition / ${v.canvasResolution};
      float posx = posFloat.x * 2.0 - 1.0;
      float posy = posFloat.y * -2.0 + 1.0;
      gl_Position = vec4(posx, posy, 0, 1);

      o_cellColor = vec4(${v.cellColor}, 1);
    }
  `)

  program.setFragmentShader(() => `
    precision highp float;

    in vec2 o_cellColor;
    out vec4 outColor;

    void main() {
      outColor = o_cellColor;
    }
  `)

  program.create()
  program.use()

  const resize = (width: number, height: number) => {
    Object.assign(rez.canvas, { width, height })
  }

  return { resize }
}
