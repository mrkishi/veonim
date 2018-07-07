import WindowNameplate from '../core/window-nameplate'
import WindowCanvas from '../core/window-canvas'
import { makel } from '../ui/vanilla'

interface WindowSizePos {
  row: number
  col: number
  width: number
  height: number
}

export interface Window extends WindowSizePos {
  id: number
  gridId: number
}

export interface Cell {
  height: number
  width: number
  padding: number
}

export interface Font {
  face: string
  size: number
  lineHeight: number
}

// container
//  - nameplate
//  - content
//    - overlay
//    - canvas

export default (winn: Window, { font, cell }: { font: Font, cell: Cell }) => {
  let win = winn
  // const win: Window = { id: 0, gridId: 0, row: 0, col: 0, width: 0, height: 0 }

  const container = makel({
    flexFlow: 'column',
    background: 'none',
  })

  const content = makel({
    display: 'flex'
  })

  const overlay = makel({
    display: 'flex',
    position: 'absolute',
  })

  const nameplate = WindowNameplate()
  const canvas = WindowCanvas({ font, cell })

  content.appendChild(overlay)
  content.appendChild(canvas.element)

  container.appendChild(nameplate.element)
  container.appendChild(content)

  const setWindowSizeAndPosition = () => {

  }

  const getWindowSizeAndPosition = (): WindowSizePos => {
    return { row: 0, col: 0, width: 0, height: 0 }
  }

  const setCssGridAttributes = () => {
    // TODO: set window div element size/pos from css grid attrs
  }

  const addOverlayElement = () => {

  }

  const removeOverlayElement = () => {

  }

  return {
    get canvas() { return canvas.api },
    getWindowSizeAndPosition,
    setWindowSizeAndPosition,
    setCssGridAttributes,
    addOverlayElement,
    removeOverlayElement,
  }
}
