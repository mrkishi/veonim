import CreateWebGL from '../render/webgl-utils'
import * as cc from '../core/canvas-container'
import TextFG from '../render/webgl-text-fg'
import TextBG from '../render/webgl-text-fg'

export default () => {
  const webgl = CreateWebGL()
  const textFGRenderer = TextFG(webgl)
  const textBGRenderer = TextBG(webgl)

  const resize = (rows: number, cols: number) => {
    webgl.resize(cols * cc.cell.width, rows * cc.cell.height)
    // TODO: update all uniforms in all programs
  }

  return {
    resize,
    element: webgl.canvasElement,
  }
}
