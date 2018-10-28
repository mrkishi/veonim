import CreateWebGL from '../render/webgl-utils'
import * as cc from '../core/canvas-container'
import TextFG from '../render/webgl-text-fg'
import TextBG from '../render/webgl-text-bg'

const nutella = () => {
  const foregroundGL = CreateWebGL()
  const backgroundGL = CreateWebGL()
  const textFGRenderer = TextFG(foregroundGL)
  const textBGRenderer = TextBG(backgroundGL)

  // TODO: when we resize, do we have to redraw the scene?
  const resize = (rows: number, cols: number) => {
    const width = cols * cc.cell.width
    const height = rows * cc.cell.height

    textFGRenderer.resize(width, height)
    textBGRenderer.resize(width, height)

    foregroundGL.resize(width, height)
    backgroundGL.resize(width, height)
  }

  /** Wrender data where each element is [ charCode, col, row, red, green, blue ] */
  const render = (fgData: Float32Array, bgData: Float32Array) => {
    textBGRenderer.render(bgData)
    textFGRenderer.render(fgData)
  }

  return {
    render,
    resize,
    foregroundElement: foregroundGL.canvasElement,
    backgroundElement: backgroundGL.canvasElement,
  }
}

export default nutella
export type WebGLWrenderer = ReturnType<typeof nutella>
