import CreateWebGL from '../render/webgl-utils'
import TextFG from '../render/webgl-text-fg'
import TextBG from '../render/webgl-text-bg'

const nutella = () => {
  const foregroundGL = CreateWebGL()
  const backgroundGL = CreateWebGL()
  const textFGRenderer = TextFG(foregroundGL)
  const textBGRenderer = TextBG(backgroundGL)

  // TODO: when we resize, do we have to redraw the scene?
  const resize = (rows: number, cols: number) => {
    textBGRenderer.resize(rows, cols)
    textFGRenderer.resize(rows, cols)
  }

  const render = (foregroundElements?: number, backgroundElements?: number) => {
    textBGRenderer.render(backgroundElements)
    textFGRenderer.render(foregroundElements)
  }

  const updateColorAtlas = (colorAtlas: HTMLCanvasElement) => {
    textBGRenderer.updateColorAtlas(colorAtlas)
    textFGRenderer.updateColorAtlas(colorAtlas)
  }

  return {
    render,
    resize,
    updateColorAtlas,
    getForegroundBuffer: textFGRenderer.getDataBuffer,
    getBackgroundBuffer: textBGRenderer.getDataBuffer,
    foregroundElement: foregroundGL.canvasElement,
    backgroundElement: backgroundGL.canvasElement,
  }
}

export default nutella
export type WebGLWrenderer = ReturnType<typeof nutella>
