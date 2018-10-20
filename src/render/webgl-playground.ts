import * as fontTextureAtlas from '../render/font-texture-atlas'
import WebGLWrenderer from '../render/webgl'
import nvim from '../core/neovim'

const charCode = (char: string): number => char.codePointAt(0) || fontTextureAtlas.CHAR_START

const main = () => {
  const webgl = WebGLWrenderer()
  Object.assign(webgl.element.style, {
    position: 'absolute',
    top: '50px',
    border: '1px solid yellow',
  })
  document.body.appendChild(webgl.element)

  webgl.changeBackgroundColor(nvim.state.background)
  nvim.watchState.background(color => webgl.changeBackgroundColor(color))
  webgl.resize(10, 80)

  // wrender loop
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

  webgl.render(wrenderData)
}

type FUCKTYPESCRIPT = any
(document as FUCKTYPESCRIPT).fonts.onloadingdone = main
