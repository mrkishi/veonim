import CreateWebGLBuffer from '../render/webgl-grid-buffer'
import CreateWebGL from '../render/webgl-utils'
import { cell } from '../core/canvas-container'
import TextFG from '../render/webgl-text-fg'
import TextBG from '../render/webgl-text-bg'

export interface WebGLView {
  resize: (rows: number, cols: number) => void
  layout: (x: number, y: number, width: number, height: number) => void
  render: (elements: number) => void
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
    const viewport = { x: 0, y: 0, width: 0, height: 0 }
    const gridBuffer = CreateWebGLBuffer()
    let dataBuffer = new Float32Array()

    // TODO: so confused about the usage of this resize...
    // when we get a redraw resize event, how does that row/col
    // number change the size of the grid layout?
    // obv we still need this rows/cols to resize the data buffers
    // but otherwise we don't care about rows and cols
    const resize = (rows: number, cols: number) => {
      const width = cols * cell.width
      const height = rows * cell.height

      if (viewport.width === width && viewport.height === height) return

      Object.assign(viewport, { width, height })
      dataBuffer = new Float32Array(rows * cols * 4)
      gridBuffer.resize(rows, cols)
    }

    const layout = (x: number, y: number, width: number, height: number) => {
      const same = viewport.x === x
        && viewport.y === y
        && viewport.width === width
        && viewport.height === height

      if (same) return

      Object.assign(viewport, { x, y, width, height })
    }

    const render = (elements: number) => {
      const buffer = dataBuffer.subarray(0, elements)
      const { x, y, width, height } = viewport
      textBGRenderer.render(buffer, x, y, width, height)
      textFGRenderer.render(buffer, x, y, width, height)
    }

    const clear = () => {
      textBGRenderer.clear()
      textFGRenderer.clear()
    }

    const moveRegionUp = (lines: number, top: number, bottom: number) => {
      gridBuffer.moveRegionUp(lines, top, bottom)
      const buffer = gridBuffer.getBuffer()
      const { x, y, width, height } = viewport
      textBGRenderer.render(buffer, x, y, width, height)
      textFGRenderer.render(buffer, x, y, width, height)
    }

    const moveRegionDown = (lines: number, top: number, bottom: number) => {
      gridBuffer.moveRegionDown(lines, top, bottom)
      const buffer = gridBuffer.getBuffer()
      const { x, y, width, height } = viewport
      textBGRenderer.render(buffer, x, y, width, height)
      textFGRenderer.render(buffer, x, y, width, height)
    }

    return {
      clear,
      render,
      resize,
      layout,
      moveRegionUp,
      moveRegionDown,
      getGridBuffer: gridBuffer.getBuffer,
      getBuffer: () => dataBuffer,
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
