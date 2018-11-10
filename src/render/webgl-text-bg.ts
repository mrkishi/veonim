import { getColorAtlas } from '../render/highlight-attributes'
import { WebGL2, VarKind } from '../render/webgl-utils'
import * as cc from '../core/canvas-container'

export default (webgl: WebGL2) => {
  const viewport = { x: 0, y: 0, width: 0, height: 0 }

  const program = webgl.setupProgram({
    quadVertex: VarKind.Attribute,
    cellPosition: VarKind.Attribute,
    hlid: VarKind.Attribute,
    canvasResolution: VarKind.Uniform,
    colorAtlasResolution: VarKind.Uniform,
    colorAtlasTextureId: VarKind.Uniform,
    cellSize: VarKind.Uniform,
  })

  program.setVertexShader(v => `
    in vec2 ${v.quadVertex};
    in vec2 ${v.cellPosition};
    in float ${v.hlid};
    uniform vec2 ${v.canvasResolution};
    uniform vec2 ${v.colorAtlasResolution};
    uniform vec2 ${v.cellSize};

    out vec2 o_colorPosition;

    void main() {
      vec2 absolutePixelPosition = ${v.cellPosition} * ${v.cellSize};
      vec2 vertexPosition = absolutePixelPosition + ${v.quadVertex};
      vec2 posFloat = vertexPosition / ${v.canvasResolution};
      float posx = posFloat.x * 2.0 - 1.0;
      float posy = posFloat.y * -2.0 + 1.0;
      gl_Position = vec4(posx, posy, 0, 1);

      o_colorPosition = vec2(${v.hlid}, 0) / ${v.colorAtlasResolution};
    }
  `)

  program.setFragmentShader(v => `
    precision highp float;

    in vec2 o_colorPosition;
    uniform sampler2D ${v.colorAtlasTextureId};

    out vec4 outColor;

    void main() {
      outColor = texture(${v.colorAtlasTextureId}, o_colorPosition);
    }
  `)

  program.create()
  program.use()

  const colorAtlas = getColorAtlas()
  webgl.loadCanvasTexture(colorAtlas, webgl.gl.TEXTURE0)
  webgl.gl.uniform1i(program.vars.colorAtlasTextureId, 0)
  webgl.gl.uniform2f(program.vars.colorAtlasResolution, colorAtlas.width, colorAtlas.height)

  // total size of all pointers. chunk size that goes to shader
  const wrenderStride = 4 * Float32Array.BYTES_PER_ELEMENT

  const wrenderBuffer = program.setupData([{
    pointer: program.vars.cellPosition,
    type: webgl.gl.FLOAT,
    size: 2,
    offset: 0,
    stride: wrenderStride,
    divisor: 1,
  }, {
    pointer: program.vars.hlid,
    type: webgl.gl.FLOAT,
    size: 1,
    offset: 2 * Float32Array.BYTES_PER_ELEMENT,
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

  webgl.gl.uniform2f(program.vars.cellSize, cc.cell.width, cc.cell.height)

  const resize = (width: number, height: number) => {
    webgl.resize(width, height)
  }

  const readjustViewportMaybe = (x: number, y: number, width: number, height: number) => {
    const same = viewport.width === width
      && viewport.height === height
      && viewport.x === x
      && viewport.y === y

    if (same) return

    Object.assign(viewport, {
      x: Math.round(x * window.devicePixelRatio),
      y: Math.round(y * window.devicePixelRatio),
      width: Math.round(width * window.devicePixelRatio),
      height: Math.round(height * window.devicePixelRatio),
    })

    webgl.gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height)
    webgl.gl.scissor(viewport.x, viewport.y, viewport.width, viewport.height)
    webgl.gl.uniform2f(program.vars.canvasResolution, width, height)
  }

  const render = (buffer: Float32Array, x: number, y: number, width: number, height: number) => {
    readjustViewportMaybe(x, y, width, height)
    wrenderBuffer.setData(buffer)
    webgl.gl.drawArraysInstanced(webgl.gl.TRIANGLES, 0, 6, buffer.length / 4)
  }

  const updateColorAtlas = (colorAtlas: HTMLCanvasElement) => {
    webgl.loadCanvasTexture(colorAtlas, webgl.gl.TEXTURE0)
    webgl.gl.uniform2f(program.vars.colorAtlasResolution, colorAtlas.width, colorAtlas.height)
  }

  const clear = () => webgl.gl.clear(webgl.gl.COLOR_BUFFER_BIT)

  return { clear, render, resize, updateColorAtlas }
}
