import CreateWindowNameplate, { NameplateState } from '../core/window-nameplate'
import CreateWindowCanvas, { WindowCanvas } from '../core/window-canvas'
import CreateWebGLBuffer, { WebGLBuffer } from '../render/webgl-buffer'
import CreateWindowGrid, { WindowGrid } from '../core/window-grid'
import CreateWebGL, { WebGLWrenderer } from '../render/webgl'
import { makel } from '../ui/vanilla'

export interface WindowInfo {
  id: number
  gridId: number
  row: number
  col: number
  width: number
  height: number
}

interface GridStyle {
  gridRow: string
  gridColumn: string
}

export interface Window {
  grid: WindowGrid
  webgl: WebGLWrenderer
  webglBuffer: WebGLBuffer
  canvas: WindowCanvas
  element: HTMLElement
  getWindowInfo(): WindowInfo
  setWindowInfo(info: WindowInfo): void
  applyGridStyle(gridStyle: GridStyle): void
  updateNameplate(data: NameplateState): void
  addOverlayElement(element: HTMLElement): void
  removeOverlayElement(element: HTMLElement): void
  resizeWindow(width: number, height: number): void
  destroy(): void
}

export default () => {
  const wininfo: WindowInfo = { id: 0, gridId: 0, row: 0, col: 0, width: 0, height: 0 }
  const grid = CreateWindowGrid()
  const webglBuffer = CreateWebGLBuffer()

  const container = makel({
    flexFlow: 'column',
    background: 'none',
    display: 'flex',
  })

  const content = makel({
    display: 'flex'
  })

  const overlay = makel({
    display: 'flex',
    position: 'absolute',
  })

  const nameplate = CreateWindowNameplate()
  const canvas = CreateWindowCanvas()
  const webgl = CreateWebGL()

  overlay.setAttribute('wat', 'overlay')
  content.setAttribute('wat', 'content')
  canvas.element.setAttribute('wat', 'canvas')
  nameplate.element.setAttribute('wat', 'nameplate')
  webgl.backgroundElement.setAttribute('wat', 'webgl-background')
  webgl.foregroundElement.setAttribute('wat', 'webgl-foreground')

  Object.assign(canvas.element.style, {
    position: 'absolute',
    zIndex: 5,
  })

  Object.assign(webgl.backgroundElement.style, {
    position: 'absolute',
    zIndex: 6,
  })

  Object.assign(webgl.foregroundElement.style, {
    position: 'absolute',
    zIndex: 7,
  })

  content.appendChild(overlay)
  // TODO: canvas only for unicode glyphs
  // no need for canvas background, just use alpha and let compositor blend!
  content.appendChild(canvas.element)
  content.appendChild(webgl.backgroundElement)
  content.appendChild(webgl.foregroundElement)

  container.appendChild(nameplate.element)
  container.appendChild(content)

  const api = {
    get grid() { return grid },
    get webgl() { return webgl },
    get webglBuffer() { return webglBuffer },
    get canvas() { return canvas.api },
    get element() { return container },
  } as Window

  api.resizeWindow = (width, height) => {
    webgl.resize(height, width)
    canvas.api.resize(height, width)
    webglBuffer.resize(height, width)
    grid.resize(height, width)
  }

  api.setWindowInfo = info => {
    container.id = `${info.id}`
    Object.assign(wininfo, info)
  }

  api.getWindowInfo = () => ({ ...wininfo })

  api.applyGridStyle = ({ gridRow, gridColumn }) => Object.assign(container.style, { gridColumn, gridRow })

  api.addOverlayElement = element => {
    overlay.appendChild(element)
    return () => overlay.removeChild(element)
  }

  api.removeOverlayElement = el => overlay.contains(el) && overlay.removeChild(el)

  api.updateNameplate = data => nameplate.update(data)

  api.destroy = () => {
    console.warn('NYI: window.destroy()')
    // TODO: destroy elements, cleanup, destroy canvas, components, anything else thanks etc.
  }

  return api
}
