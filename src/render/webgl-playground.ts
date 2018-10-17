import * as fontTextureAtlas from '../render/font-texture-atlas'
import { WebGL2 } from '../render/webgl-utils'
import * as cc from '../core/canvas-container'

const quadVertexGen = (cellWidth: number, cellHeight: number) => (row: number, col: number) => {
  // TODO: accept row to row row row your boat gently down the stream
  const xleft = cellWidth * col
  const xright = xleft + cellWidth
  const ytop = cellHeight * row
  const ybottom = ytop + cellHeight

  return [
    xleft, ytop,
    xright, ybottom,
    xleft, ybottom,
    xright, ytop,
    xright, ybottom,
    xleft, ytop,
  ]
}

const boqibcszzxpp = (fuckYou: Function) => (count: number) => {
  let res: any[] = []
  for (let ix = 1; ix <= count; ix++) res = [...res, ...fuckYou(2, ix)]
  return res
}

const dothewebglthing = (canvasElement: HTMLCanvasElement) => {
  const { gl, canvas, resize, setupProgram, createVertexArray, setupArrayBuffer, setupCanvasTexture, setupVertexArray } = WebGL2()
  Object.assign(canvas.style, {
    top: '100px',
    position: 'absolute',
    border: '1px solid red',
  })

  document.body.appendChild(canvas)

  const tester = document.createElement('div')
  Object.assign(tester.style, {
    top: '200px',
    position: 'absolute',
    color: 'rgb(255, 221, 0)',
    fontSize: '14px',
    width: '200%',
  })
  document.body.appendChild(tester)

  const program = setupProgram({
    position: 'a',
    texturePosition: 'a',
    canvasResolution: 'u',
    textureResolution: 'u',
  })

  program.setVertexShader(v => `
    in vec2 ${v.position}
    `)

  const vertexShader = `
    in vec2 a_position;
    in vec2 a_texCoord;
    uniform vec2 u_canvas_res;
    uniform vec2 u_texture_res;

    out vec2 v_texCoord;

    void main() {
      vec2 relativePosition = a_position / u_canvas_res;
      float posx = relativePosition.x * 2.0 - 1.0;
      float posy = relativePosition.y * -2.0 + 1.0;
      v_texCoord = a_texCoord / u_texture_res;
      gl_Position = vec4(posx, posy, 0, 1);
    }
  `

  const fragmentShader = `
    precision highp float;

    uniform vec4 u_color;
    in vec2 v_texCoord;
    uniform sampler2D u_image;
    out vec4 outColor;

    void main() {
      vec4 texColor = texture(u_image, v_texCoord);
      outColor = texColor * u_color;
    }
  `

  // const program = createProgram(vertexShader, fragmentShader)
  // if (!program) return console.error('webgl failed big time')

  // const loc = {
  //   a_position: gl.getAttribLocation(program, 'a_position'),
  //   a_texCoord: gl.getAttribLocation(program, 'a_texCoord'),
  //   u_canvas_res: gl.getUniformLocation(program, 'u_canvas_res'),
  //   u_texture_res: gl.getUniformLocation(program, 'u_texture_res'),
  //   u_color: gl.getUniformLocation(program, 'u_color'),
  //   u_image: gl.getUniformLocation(program, 'u_image'),
  // }

  createVertexArray()

  // TODO: TODO TODO TODO TODO LOL TODO
  // how much shit can we move to shaders for calc
  // change the arrays to not be float32
  // support char color thanks
  // use vertexAttribDivisor to run the vertex position attributes
  // more than once (instanced drawing with drawArraysInstanced)
  // see cheat codes here: https://stackoverflow.com/a/46068799
  // yo can we combine the arrays for position + texture into one?
  // cell background solid color rendering - do we send vertices
  // for each cell and draw them all? or try to combine in JS
  // before wrendering? we will probably have many dupes
  // actually we should check with the new UI protocol. we may
  // get them batched already.

  const positionToQuad = quadVertexGen(cc.cell.width, cc.cell.height)
  const qqqqbrbr = boqibcszzxpp(positionToQuad)

  const gimmeCookie = (char: string) => positionToQuad(0, char.charCodeAt(0) - 32)
  const mindedMusicSessions = (phrase: string) => phrase.split('').reduce((res, m) => {
    return [...res, ...gimmeCookie(m)]
  }, [] as number[])

  const urMomInsult = 'whatever you mean'
  tester.innerText = urMomInsult
  const poo = mindedMusicSessions(urMomInsult)

  // TEXTURE COORDS
  // TODO: probably not use Float32Array for simple small ints
  // TODO: look into the unsigned_byte, normalize shit. make this EFFICIENT SON
  setupArrayBuffer(new Float32Array(poo))
  setupVertexArray(loc.a_texCoord, { size: 2, type: gl.FLOAT })

  const shit = qqqqbrbr(urMomInsult.length)

  // POSITION COORDS
  // TODO: probably not use Float32Array for simple small ints
  setupArrayBuffer(new Float32Array(shit))
  setupVertexArray(loc.a_position, { size: 2, type: gl.FLOAT })

  setupCanvasTexture(canvasElement)

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
  gl.useProgram(program)
  gl.uniform4fv(loc.u_color, new Float32Array([1.0, 0.86, 0.0, 1.0]))
  gl.uniform1i(loc.u_image, 0)
  gl.uniform2f(loc.u_canvas_res, res.canvas.width, res.canvas.height)
  gl.uniform2f(loc.u_texture_res, res.texture.width, res.texture.height)
  // gl.clearColor(0.0, 0.1, 0.1, 1.0)
  // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  gl.drawArrays(gl.TRIANGLES, 0, urMomInsult.length * 6)
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
