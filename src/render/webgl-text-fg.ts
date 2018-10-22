import * as fontTextureAtlas from '../render/font-texture-atlas'
import { WebGL2, VarKind } from '../render/webgl-utils'
import * as cc from '../core/canvas-container'

export default (webgl: WebGL2) => {
  const rez = {
    texture: { width: 0, height: 0 },
    canvas: { width: 0, height: 0 },
  }

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
  webgl.loadCanvasTexture(fontAtlas.element)

  Object.assign(rez.texture, {
    width: Math.round(fontAtlas.element.width / window.devicePixelRatio),
    height: Math.round(fontAtlas.element.height / window.devicePixelRatio),
  })

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

  const resize = (width: number, height: number) => {
    Object.assign(rez.canvas, { width, height })
  }

  const activate = () => {
    program.use()

    quadBuffer.setData(new Float32Array([
      0, 0,
      cc.cell.width, cc.cell.height,
      0, cc.cell.height,
      cc.cell.width, 0,
      cc.cell.width, cc.cell.height,
      0, 0,
    ]))

    webgl.gl.uniform1i(program.vars.textureImage, 0)
    webgl.gl.uniform2f(program.vars.canvasResolution, rez.canvas.width, rez.canvas.height)
    webgl.gl.uniform2f(program.vars.textureResolution, rez.texture.width, rez.texture.height)
    webgl.gl.uniform2f(program.vars.cellSize, cc.cell.width, cc.cell.height)
  }

  const render = (data: Float32Array) => {
    wrenderBuffer.setData(data)
    webgl.gl.drawArraysInstanced(webgl.gl.TRIANGLES, 0, 6, data.length / wrenderElements)
  }

  return { activate, render, resize }
}
