import CreateWebGLBuffer from '../render/webgl-grid-buffer'
import CreateWebGL from '../render/webgl-utils'
import { cell } from '../core/canvas-container'
import TextFG from '../render/webgl-text-fg'
import TextBG from '../render/webgl-text-bg'

export interface WebGLView {
  resize: (rows: number, cols: number) => void
  render: (buffer: Float32Array) => void
  clear: () => void
  moveRegionUp: (lines: number, top: number, bottom: number) => void
  moveRegionDown: (lines: number, top: number, bottom: number) => void
  getGridBuffer: () => Float32Array
  getBuffer: () => Float32Array
}

const nutella = () => {
  const foregroundGL = CreateWebGL({ alpha: true, preserveDrawingBuffer: true })
  const backgroundGL = CreateWebGL({ alpha: true, preserveDrawingBuffer: true })

  const textFGRenderer = TextFG(foregroundGL)
  const textBGRenderer = TextBG(backgroundGL)

  const resize = (width: number, height: number) => {
    textBGRenderer.resize(width, height)
    textFGRenderer.resize(width, height)
  }

  const updateFontAtlas = (fontAtlas: HTMLCanvasElement) => {
    textFGRenderer.updateFontAtlas(fontAtlas)
  }

  const updateColorAtlas = (colorAtlas: HTMLCanvasElement) => {
    textBGRenderer.updateColorAtlas(colorAtlas)
    textFGRenderer.updateColorAtlas(colorAtlas)
  }

  const createView = (): WebGLView => {
    const viewport = { width: 0, height: 0 }
    const gridBuffer = CreateWebGLBuffer()
    let sharedDataBuffer = new Float32Array()

    const resize = (rows: number, cols: number) => {
      const width = cols * cell.width
      const height = rows * cell.height

      if (viewport.width === width && viewport.height === height) return

      Object.assign(viewport, { width, height })
      sharedDataBuffer = new Float32Array(rows * cols * 4)
      gridBuffer.resize(rows, cols)
    }

    const render = (buffer: Float32Array) => {
      textBGRenderer.render(buffer, viewport.width, viewport.height)
      textFGRenderer.render(buffer, viewport.width, viewport.height)
    }

    const clear = () => {
      textBGRenderer.clear()
      textFGRenderer.clear()
    }

    const moveRegionUp = (lines: number, top: number, bottom: number) => {
      gridBuffer.moveRegionUp(lines, top, bottom)
      const buffer = gridBuffer.getBuffer()
      textBGRenderer.render(buffer, viewport.width, viewport.height)
      textFGRenderer.render(buffer, viewport.width, viewport.height)
    }

    const moveRegionDown = (lines: number, top: number, bottom: number) => {
      gridBuffer.moveRegionDown(lines, top, bottom)
      const buffer = gridBuffer.getBuffer()
      textBGRenderer.render(buffer, viewport.width, viewport.height)
      textFGRenderer.render(buffer, viewport.width, viewport.height)
    }

    return {
      clear,
      render,
      resize,
      moveRegionUp,
      moveRegionDown,
      getGridBuffer: gridBuffer.getBuffer,
      getBuffer: () => sharedDataBuffer,
    }
  }

  return {
    resize,
    createView,
    updateFontAtlas,
    updateColorAtlas,
    foregroundElement: foregroundGL.canvasElement,
    backgroundElement: backgroundGL.canvasElement,
  }
}

export default nutella
export type WebGLRenderer = ReturnType<typeof nutella>
