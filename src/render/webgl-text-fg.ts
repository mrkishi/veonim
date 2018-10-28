import * as fontTextureAtlas from '../render/font-texture-atlas'
import { WebGL2, VarKind } from '../render/webgl-utils'
import * as cc from '../core/canvas-container'

export default (webgl: WebGL2) => {
  const size = { rows: 0, cols: 0 }

  const program = webgl.setupProgram({
    quadVertex: VarKind.Attribute,
    charCode: VarKind.Attribute,
    cellPosition: VarKind.Attribute,
    charColor: VarKind.Attribute,
    canvasResolution: VarKind.Uniform,
    textureResolution: VarKind.Uniform,
    textureImage: VarKind.Uniform,
    cellSize: VarKind.Uniform,
  })

  program.setVertexShader(v => `
    in vec2 ${v.quadVertex};
    in vec2 ${v.cellPosition};
    in vec3 ${v.charColor};
    in float ${v.charCode};
    uniform vec2 ${v.canvasResolution};
    uniform vec2 ${v.textureResolution};
    uniform vec2 ${v.cellSize};

    out vec4 o_glyphColor;
    out vec2 o_glyphPosition;

    void main() {
      vec2 absolutePixelPosition = ${v.cellPosition} * ${v.cellSize};
      vec2 vertexPosition = absolutePixelPosition + ${v.quadVertex};
      vec2 posFloat = vertexPosition / ${v.canvasResolution};
      float posx = posFloat.x * 2.0 - 1.0;
      float posy = posFloat.y * -2.0 + 1.0;
      gl_Position = vec4(posx, posy, 0, 1);

      float charIndex = ${v.charCode} - ${fontTextureAtlas.CHAR_START}.0;
      vec2 glyphPixelPosition = vec2(charIndex, 0) * ${v.cellSize};
      vec2 glyphVertex = glyphPixelPosition + ${v.quadVertex};
      o_glyphPosition = glyphVertex / ${v.textureResolution};

      o_glyphColor = vec4(${v.charColor}, 1);
    }
  `)

  program.setFragmentShader(v => `
    precision highp float;

    in vec2 o_glyphPosition;
    in vec4 o_glyphColor;
    uniform sampler2D ${v.textureImage};

    out vec4 outColor;

    void main() {
      vec4 color = texture(${v.textureImage}, o_glyphPosition);
      outColor = color * o_glyphColor;
    }
  `)

  program.create()
  program.use()

  const fontAtlas = fontTextureAtlas.generateStandardSet()
  const textureUnitId = webgl.loadCanvasTexture(fontAtlas.element)
  const atlasWidth = Math.round(fontAtlas.element.width / window.devicePixelRatio)
  const atlasHeight = Math.round(fontAtlas.element.height / window.devicePixelRatio)

  webgl.gl.uniform1i(program.vars.textureImage, textureUnitId)
  webgl.gl.uniform2f(program.vars.textureResolution, atlasWidth, atlasHeight)

  // total size of all pointers. chunk size that goes to shader
  const wrenderElements = 6
  const wrenderStride = wrenderElements * Float32Array.BYTES_PER_ELEMENT

  const wrenderBuffer = program.setupData([{
    pointer: program.vars.charCode,
    type: webgl.gl.FLOAT,
    size: 1,
    offset: 0,
    stride: wrenderStride,
    divisor: 1,
  }, {
    pointer: program.vars.cellPosition,
    type: webgl.gl.FLOAT,
    size: 2,
    offset: Float32Array.BYTES_PER_ELEMENT,
    stride: wrenderStride,
    divisor: 1,
  }, {
    pointer: program.vars.charColor,
    type: webgl.gl.FLOAT,
    size: 3,
    offset: 3 * Float32Array.BYTES_PER_ELEMENT,
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

  // TODO: we should probably check if existing width and height are the same
  // and not recreate and resize with identical values
  const resize = (rows: number, cols: number) => {
    if (size.rows === rows && size.cols === cols) return

    Object.assign(size, { rows, cols })
    const width = cols * cc.cell.width
    const height = rows * cc.cell.height

    webgl.resize(width, height)
    dataBuffer = new Float32Array(rows * cols * wrenderElements)
    console.log('resized dataBuffer', dataBuffer)
    webgl.gl.uniform2f(program.vars.canvasResolution, width, height)
  }

  const render = (count = dataBuffer.length) => {
    // TODO: set entire buffer or subarray the range?
    wrenderBuffer.setData(dataBuffer)
    webgl.gl.drawArraysInstanced(webgl.gl.TRIANGLES, 0, 6, count / wrenderElements)
  }

  return {
    render,
    resize,
    getDataBuffer: () => dataBuffer,
  }
}
