import * as fontTextureAtlas from '../render/font-texture-atlas'
import { WebGL2, VarKind } from '../render/webgl-utils'
import * as cc from '../core/canvas-container'

const dothewebglthing = (canvasElement: HTMLCanvasElement) => {
  const { gl, canvas, resize, setupProgram, loadCanvasTexture } = WebGL2()
  Object.assign(canvas.style, {
    top: '100px',
    position: 'absolute',
    border: '1px solid red',
  })

  document.body.appendChild(canvas)

  const program = setupProgram({
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

  // TODO: TODO TODO TODO TODO LOL TODO
  // no alpha. maybe faster?
  // cell background solid color rendering - do we send vertices
  // for each cell and draw them all? or try to combine in JS
  // before wrendering? we will probably have many dupes
  // actually we should check with the new UI protocol. we may
  // get them batched already.

  const quadBuffer = program.setupData({
    pointer: program.vars.quadVertex,
    type: gl.FLOAT,
    size: 2,
  })

  // total size of all pointers. chunk size that goes to shader
  const wrenderElements = 6
  const wrenderStride = wrenderElements * Float32Array.BYTES_PER_ELEMENT
  const colorOffset = 3 * Float32Array.BYTES_PER_ELEMENT

  const wrenderBuffer = program.setupData([{
    pointer: program.vars.charCode,
    type: gl.FLOAT,
    size: 1,
    offset: 0,
    stride: wrenderStride,
    divisor: 1,
  }, {
    pointer: program.vars.cellPosition,
    type: gl.FLOAT,
    size: 2,
    offset: Float32Array.BYTES_PER_ELEMENT,
    stride: wrenderStride,
    divisor: 1,
  }, {
    pointer: program.vars.charColor,
    type: gl.FLOAT,
    size: 3,
    offset: colorOffset,
    stride: wrenderStride,
    divisor: 1,
  }])

  const charCode = (char: string): number => char.codePointAt(0) || fontTextureAtlas.CHAR_START

  loadCanvasTexture(canvasElement)

  const res = {
    canvas: {
      width: cc.cell.width * 50,
      height: cc.cell.height * 3,
    },
    texture: {
      width: Math.round(canvasElement.width / 2),
      height: Math.round(canvasElement.height / 2),
    },
  }

  resize(res.canvas.width, res.canvas.height)
  gl.uniform1i(program.vars.textureImage, 0)
  gl.uniform2f(program.vars.canvasResolution, res.canvas.width, res.canvas.height)
  gl.uniform2f(program.vars.textureResolution, res.texture.width, res.texture.height)
  gl.uniform2f(program.vars.cellSize, cc.cell.width, cc.cell.height)

  // TODO: static_draw vs dynamic_draw vs stream_draw? what use
  quadBuffer.setData(new Float32Array([
    0, 0,
    cc.cell.width, cc.cell.height,
    0, cc.cell.height,
    cc.cell.width, 0,
    cc.cell.width, cc.cell.height,
    0, 0,
  ]))

  // WRENDER LOOP
  const wrenderData = [
    // char code, col, row, red, green, blue
    charCode('f'), 2, 2, 1, 0, 0,
    charCode('u'), 3, 2, 0, 1, 0,
    charCode('c'), 4, 2, 0, 0, 1,
    charCode('k'), 5, 2, 0, 1, 1,

    charCode('a'), 0, 1, 1, 1, 0,
    charCode('s'), 1, 1, 1, 1, 1,
    charCode('s'), 2, 1, 1, 0, 1,
  ]

  // TODO: static_draw vs dynamic_draw vs stream_draw? what use
  wrenderBuffer.setData(new Float32Array(wrenderData))
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, wrenderData.length / wrenderElements)
}

const main = () => {
  const container = document.createElement('div')

  Object.assign(container.style, {
    top: '50px',
    position: 'absolute',
  })

  const { element } = fontTextureAtlas.generateStandardSet()
  element.style.border = '1px solid yellow'
  container.appendChild(element)

  document.body.appendChild(container)
  dothewebglthing(element)
}

type FUCKTYPESCRIPT = any
(document as FUCKTYPESCRIPT).fonts.onloadingdone = main
