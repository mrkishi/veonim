import * as fontTextureAtlas from '../render/font-texture-atlas'
import { WebGL2 } from '../render/webgl-utils'

const dothewebglthing = (canvasElement: HTMLCanvasElement) => {
  const { gl, canvas, resize, createProgram, createVertexArray, setupArrayBuffer, setupCanvasTexture, setupVertexArray } = WebGL2()
  Object.assign(canvas.style, {
    top: '100px',
    position: 'absolute',
    border: '1px solid red',
  })

  document.body.appendChild(canvas)

  const tester = document.createElement('div')
  Object.assign(tester.style, {
    top: '150px',
    position: 'absolute',
    color: 'rgb(255, 221, 0)',
    fontSize: '14px',
    width: '200%',
  })
  tester.innerText = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUV'
  document.body.appendChild(tester)

  const vertexShader = `
    in vec2 a_position;
    in vec2 a_texCoord;

    out vec2 v_texCoord;

    void main() {
      gl_Position = vec4(a_position, 0, 1);
      v_texCoord = a_texCoord;
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

  const program = createProgram(vertexShader, fragmentShader)
  if (!program) return console.error('webgl failed big time')

  const loc = {
    a_position: gl.getAttribLocation(program, 'a_position'),
    a_texCoord: gl.getAttribLocation(program, 'a_texCoord'),
    u_color: gl.getUniformLocation(program, 'u_color'),
    u_resolution: gl.getUniformLocation(program, 'u_resolution'),
    u_image: gl.getUniformLocation(program, 'u_image'),
  }

  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
  createVertexArray()

  // TEXTURE COORDS
  setupArrayBuffer(new Float32Array([
    // x, y
    // textures are upside down, so we need to flip y axis
    // x axis is the same
    // so look at the position vertices and do the following transformations:
    //
    // x
    // -1.0 -> 0.0
    // 1.0 -> 1.0
    //
    // y
    // -1.0 -> 1.0
    // 1.0 -> 0.0
    0.0, 1.0,
    1.0, 0.0,
    0.0, 0.0,
    1.0, 1.0,
    1.0, 0.0,
    0.0, 1.0,
  ]))
  setupVertexArray(loc.a_texCoord, { size: 2, type: gl.FLOAT })

  // POSITION COORDS
  setupArrayBuffer(new Float32Array([
    -1.0, -1.0,
    1.0, 1.0,
    -1.0, 1.0,
    1.0, -1.0,
    1.0, 1.0,
    -1.0, -1.0,
  ]))
  setupVertexArray(loc.a_position, { size: 2, type: gl.FLOAT })

  setupCanvasTexture(canvasElement)
  resize(canvasElement.width / 4, canvasElement.height / 4)

  gl.useProgram(program)
  gl.uniform4fv(loc.u_color, new Float32Array([1.0, 0.86, 0.0, 1.0]))
  gl.uniform1i(loc.u_image, 0)
  // gl.clearColor(0.0, 0.1, 0.1, 1.0)
  // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  gl.drawArrays(gl.TRIANGLES, 0, 6)
}

const main = () => {
  const container = document.createElement('div')

  Object.assign(container.style, {
    top: '50px',
    position: 'absolute',
    width: '100%',
    height: '100%',
  })

  const { element } = fontTextureAtlas.generateStandardSet()
  element.style.border = '1px solid yellow'
  container.appendChild(element)

  document.body.appendChild(container)
  dothewebglthing(element)
}

type FUCKTYPESCRIPT = any
(document as FUCKTYPESCRIPT).fonts.onloadingdone = main
