import * as fontTextureAtlas from '../render/font-texture-atlas'
import { WebGL2 } from '../render/webgl-utils'

const dothewebglthing = (canvasElement: HTMLCanvasElement) => {
  const { gl, canvas, resize, createProgram, setupArrayBuffer, setupCanvasTexture, setupVertexArray } = WebGL2()
  Object.assign(canvas.style, { top: '100px', position: 'absolute' })
  document.body.appendChild(canvas)

  const vertexShader = `
    in vec2 a_position;
    out vec2 v_texCoord;

    void main() {
      v_texCoord = a_position;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `

  const fragmentShader = `
    precision highp float;

    in vec2 v_texCoord;
    uniform sampler2D u_image;
    out vec4 outColor;

    void main() {
      outColor = texture(u_image, v_texCoord);
    }
  `

  const program = createProgram(vertexShader, fragmentShader)
  if (!program) return console.error('webgl failed big time')

  const loc = {
    a_position: gl.getAttribLocation(program, 'a_position'),
    u_color: gl.getUniformLocation(program, 'u_color'),
  }

  setupCanvasTexture(canvasElement)

  setupArrayBuffer(new Float32Array([
    0.0,  0.0,
    1.0,  0.0,
    0.0,  1.0,
    0.0,  1.0,
    1.0,  0.0,
    1.0,  1.0,
  ]))

  setupVertexArray(loc.a_position, { size: 2, type: gl.FLOAT })

  resize(300, 100)

  gl.useProgram(program)
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
