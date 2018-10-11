import * as fontTextureAtlas from '../render/font-texture-atlas'
import { WebGL2 } from '../render/webgl-utils'

const dothewebglthing = (canvasElement: HTMLCanvasElement) => {
  const { gl, canvas, createProgram, setupArrayBuffer, setupCanvasTexture, setupVertexArray } = WebGL2()

  const vertexShader = `
    in vec4 aPosition;

    void main() {
      gl_Position = aPosition;
    }
  `

  const fragmentShader = `
    precision highp float;

    out vec4 outColor;

    void main() {
      outColor = vec4(1, 0, 0.5, 1);
    }
  `

  const program = createProgram(vertexShader, fragmentShader)
  if (!program) return console.error('webgl failed big time')

  const attribLocs = {
    aPosition: gl.getAttribLocation(program, 'aPosition'),
  }

  setupCanvasTexture(canvasElement)

  const positions = [
    0, 0,
    0, 0.5,
    0.7, 0,
  ]

  setupArrayBuffer(new Float32Array(positions))
  setupVertexArray(attribLocs.aPosition)

  Object.assign(canvas.style, {
    top: '100px',
    position: 'absolute',
    width: '100%',
    height: '100%',
  })

  document.body.appendChild(canvas)
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
