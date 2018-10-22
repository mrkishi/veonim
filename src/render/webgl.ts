import CreateWebGL from '../render/webgl-utils'
import * as cc from '../core/canvas-container'
import TextFG from '../render/webgl-text-fg'
import TextBG from '../render/webgl-text-bg'

export default () => {
  const webgl = CreateWebGL()
  const webgl2 = CreateWebGL()
  const textFGRenderer = TextFG(webgl)
  const textBGRenderer = TextBG(webgl2)

  const resize = (rows: number, cols: number) => {
    const width = cols * cc.cell.width
    const height = rows * cc.cell.height

    textFGRenderer.resize(width, height)
    textBGRenderer.resize(width, height)

    webgl.resize(width, height)
    webgl2.resize(width, height)
  }

  let activated = false

  /** Wrender data where each element is [ charCode, col, row, red, green, blue ] */
  const render = (fgData: Float32Array, bgData: Float32Array) => {
    if (!activated) {
      activated = true
      // TODO: since webgl canvases are single purpose use, we can get rid of
      // the activate methods and just have them bound to init
      textBGRenderer.activate()
      textFGRenderer.activate()
    }
    // i'm not seeing any tangible difference in browser compositing between 
    // alpha and disabled alpha. am i doing something wrong? (probably)
    // shouldn't alpha: false be faster somehow?
    textBGRenderer.render(bgData)
    textFGRenderer.render(fgData)
  }

  return { render, resize, element: webgl.canvasElement, element2: webgl2.canvasElement }
}
