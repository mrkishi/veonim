import * as fontTextureAtlas from '../render/font-texture-atlas'
import { WebGL2 } from '../render/webgl-utils'

const dothewebglthing = (canvasElement: HTMLCanvasElement) => {
  const { gl, canvas, resize, createProgram, setupArrayBuffer, setupCanvasTexture, setupVertexArray } = WebGL2()
  Object.assign(canvas.style, { top: '100px', position: 'absolute' })
  document.body.appendChild(canvas)

  const vertexShader = `
    in vec2 a_position;

    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `

  const fragmentShader = `
    precision highp float;

    uniform vec4 u_color;
    out vec4 outColor;

    void main() {
      outColor = u_color;
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
    0, 0,
    0, 0.5,
    0.7, 0,
  ]))

  setupVertexArray(loc.a_position, {
    size: 2,
    type: gl.FLOAT,
  })

  resize(300, 300)

  gl.useProgram(program)

  const colors = [0.0, 0.0, 0.0, 1.0]
  let fwd = true

  const wrender = () => {
    if (colors[0] > 0.99) fwd = false
    if (colors[0] < 0.01) fwd = true

    if (fwd) {
      colors[0] += 0.01
      colors[1] += 0.01
      colors[2] += 0.01
    } else {
      colors[0] -= 0.01
      colors[1] -= 0.01
      colors[2] -= 0.01
    }

    // gl.clearColor(0.0, 0.1, 0.1, 1.0)
    // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.uniform4fv(loc.u_color, new Float32Array(colors))
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    requestAnimationFrame(wrender)
  }

  requestAnimationFrame(wrender)
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
