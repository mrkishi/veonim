import { WebGL2, VarKind } from '../render/webgl-utils'
import * as cc from '../core/canvas-container'

export default (webgl: WebGL2) => {
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
    in vec3 ${v.cellColor};
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

    in vec4 o_cellColor;
    out vec4 outColor;

    void main() {
      outColor = o_cellColor;
    }
  `)

  program.create()
  program.use()

  // total size of all pointers. chunk size that goes to shader
  const wrenderElements = 5
  const wrenderStride = wrenderElements * Float32Array.BYTES_PER_ELEMENT
  const colorOffset = 2 * Float32Array.BYTES_PER_ELEMENT

  const wrenderBuffer = program.setupData([{
    pointer: program.vars.cellPosition,
    type: webgl.gl.FLOAT,
    size: 2,
    offset: 0,
    stride: wrenderStride,
    divisor: 1,
  }, {
    pointer: program.vars.cellColor,
    type: webgl.gl.FLOAT,
    size: 3,
    offset: colorOffset,
    stride: wrenderStride,
    divisor: 1,
  }])

  const quadBuffer = program.setupData({
    pointer: program.vars.quadVertex,
    type: webgl.gl.FLOAT,
    size: 2,
  })

  quadBuffer.setData(new Float32Array([
    0, 0,
    cc.cell.width, cc.cell.height,
    0, cc.cell.height,
    cc.cell.width, 0,
    cc.cell.width, cc.cell.height,
    0, 0,
  ]))

  let dataBuffer = new Float32Array()

  webgl.gl.uniform2f(program.vars.cellSize, cc.cell.width, cc.cell.height)

  const resize = (width: number, height: number) => {
    webgl.resize(width, height)
    dataBuffer = new Float32Array(width * height * wrenderElements)
    webgl.gl.uniform2f(program.vars.canvasResolution, width, height)
  }

  const render = () => {
    wrenderBuffer.setData(dataBuffer)
    webgl.gl.drawArraysInstanced(webgl.gl.TRIANGLES, 0, 6, dataBuffer.length / wrenderElements)
  }

  return { render, resize }
}
