import CreateWindowNameplate, { NameplateState } from '../core/window-nameplate'
import CreateCanvasRenderer, { CanvasRenderer } from '../render/canvas'
import CreateWebGLRenderer, { WebGLRenderer } from '../render/webgl'
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
  webgl: WebGLRenderer
  canvas: CanvasRenderer
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
  const webgl = CreateWebGLRenderer()
  const canvas = CreateCanvasRenderer()

  overlay.setAttribute('wat', 'overlay')
  content.setAttribute('wat', 'content')
  canvas.element.setAttribute('wat', 'canvas')
  nameplate.element.setAttribute('wat', 'nameplate')
  webgl.backgroundElement.setAttribute('wat', 'webgl-background')
  webgl.foregroundElement.setAttribute('wat', 'webgl-foreground')

  Object.assign(webgl.backgroundElement.style, {
    position: 'absolute',
    zIndex: 5,
  })

  Object.assign(canvas.element.style, {
    position: 'absolute',
    zIndex: 6,
  })

  Object.assign(webgl.foregroundElement.style, {
    position: 'absolute',
    zIndex: 7,
  })

  content.appendChild(overlay)
  content.appendChild(webgl.backgroundElement)
  // content.appendChild(canvas.element)
  content.appendChild(webgl.foregroundElement)

  container.appendChild(nameplate.element)
  container.appendChild(content)

  const api = {
    get webgl() { return webgl },
    get canvas() { return canvas },
    get element() { return container },
  } as Window

  api.resizeWindow = (width, height) => {
    webgl.resize(height, width)
    canvas.resize(height, width)
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
