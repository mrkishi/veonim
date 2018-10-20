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
  }

  /** Wrender data where each element is [ charCode, col, row, red, green, blue ] */
  const render = (data: number[]) => {
    // TODO: if we let chrome do the alpha rendering, then maybe we can stack
    // webgl canvases? i wonder if the perf is better if we let chrome
    // do the compositing versus constantly switching programs
    textFGRenderer.activate()
    textFGRenderer.render(data)
  }

  return { render, resize, element: webgl.canvasElement }
}
