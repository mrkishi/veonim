import CreateWebGL from '../render/webgl-utils'
import * as cc from '../core/canvas-container'
import TextFG from '../render/webgl-text-fg'
import TextBG from '../render/webgl-text-fg'

export default () => {
  const webgl = CreateWebGL()
  const textFGRenderer = TextFG(webgl)
  const textBGRenderer = TextBG(webgl)

  const resize = (rows: number, cols: number) => {
    const width = cols * cc.cell.width
    const height = rows * cc.cell.height

    textFGRenderer.resize(width, height)
    textBGRenderer.resize(width, height)

    webgl.resize(width, height)
    webgl.gl.clearColor(0.0, 0.1, 0.1, 1.0)
    webgl.gl.clear(webgl.gl.COLOR_BUFFER_BIT | webgl.gl.DEPTH_BUFFER_BIT)
  }

  return {
    resize,
    element: webgl.canvasElement,
  }
}
