import CreateWindowNameplate, { NameplateState } from '../core/window-nameplate'
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
    display: 'flex',
    flex: 1,
    background: 'var(--background)',
  })

  const overlay = makel({
    display: 'flex',
    position: 'absolute',
  })

  const nameplate = CreateWindowNameplate()

  overlay.setAttribute('wat', 'overlay')
  content.setAttribute('wat', 'content')
  nameplate.element.setAttribute('wat', 'nameplate')

  content.appendChild(overlay)
  container.appendChild(nameplate.element)
  container.appendChild(content)

  const api = {
    get element() { return container },
  } as Window

  api.resizeWindow = (width, height) => {
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
