import * as fontTextureAtlas from '../render/font-texture-atlas'
import { WebGL2 } from '../render/webgl-utils'

const dothewebglthing = () => {
  const { canvas, createVertexShader, createFragmentShader } = WebGL2()

  createVertexShader(`
    void main()
  `)

  createFragmentShader(`
    void main()
  `)

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
  dothewebglthing()
}

type FUCKTYPESCRIPT = any
(document as FUCKTYPESCRIPT).fonts.onloadingdone = main
