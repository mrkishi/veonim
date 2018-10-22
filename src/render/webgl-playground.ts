import * as fontTextureAtlas from '../render/font-texture-atlas'
import WebGLWrenderer from '../render/webgl'

const charCode = (char: string): number => char.codePointAt(0) || fontTextureAtlas.CHAR_START

const main = () => {
  const webgl = WebGLWrenderer()
  Object.assign(webgl.element2.style, {
    position: 'absolute',
    top: '50px',
    border: '1px solid cyan',
    zIndex: 10,
  })
  Object.assign(webgl.element.style, {
    position: 'absolute',
    top: '50px',
    border: '1px solid yellow',
    zIndex: 20,
  })
  document.body.appendChild(webgl.element2)
  document.body.appendChild(webgl.element)

  const size = { x: 100, y: 45 }
  webgl.resize(size.y, size.x)

  // wrender loop
  const fgData = new Float32Array([
    // char code, col, row, red, green, blue
    charCode('a'), 0, 0, 1, 1, 0,
    charCode('s'), 1, 0, 1, 1, 1,
    charCode('s'), 2, 0, 1, 0, 1,
    charCode('f'), 3, 0, 1, 0, 0,
    charCode('u'), 4, 0, 0, 1, 0,
    charCode('c'), 5, 0, 0, 0, 1,
    charCode('k'), 6, 0, 0, 1, 1,
  ])

  const bgData = new Float32Array([
    // col, row, red, green, blue
    2, 2, 0, 0.1, 0.4,
    3, 2, 0, 0.1, 0.4,
    4, 2, 0, 0.1, 0.4,
    5, 2, 0, 0.1, 0.4,

    0, 1, 0.1, 0.2, 0,
    1, 1, 0.1, 0.2, 0,
    2, 1, 0.1, 0.2, 0,
  ])

  webgl.render(fgData, bgData)

  const chars = [97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122]
  let charIx = 0
  const nextChar = () => {
    charIx = charIx + 1 > chars.length - 1
      ? 0
      : charIx + 1
    return chars[charIx]
  }

  const storage = new Float32Array(size.y * size.x * 6)
  let where = 0

  for (let iy = 0; iy < size.y; iy++) {
    for (let ix = 0; ix < size.x; ix++) {
      storage[where + 0] = nextChar()
      storage[where + 1] = ix
      storage[where + 2] = iy
      storage[where + 3] = 0.9
      storage[where + 4] = 0.8
      storage[where + 5] = 0.7
      where += 6
    }
  }

  // TODO: how to clear characters FG & BG

  setTimeout(() => {
    webgl.render(storage, bgData)
  }, 500)
}

type FUCKTYPESCRIPT = any
(document as FUCKTYPESCRIPT).fonts.onloadingdone = main
