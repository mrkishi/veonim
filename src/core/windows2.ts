import { TransferRegion } from '../core/window-canvas'
import CreateWindow, { Window } from '../core/window'
import { font, cell } from '../core/canvas-container'
import { merge } from '../support/utils'

const container = document.getElementById('windows') as HTMLElement

merge(container.style, {
  flex: 1,
  maxWidth: '100%',
  display: 'grid',
  gridGap: '2px',
  justifyItems: 'stretch',
  alignItems: 'stretch',
})

// TODO: track current window? use currentWindow to append elements to overlay like file menu?
// TODO: getWindow(windowId) for

// TODO: do we need a map with key of window id?
const windows = new Map<number, Window>()

export const setWindow = (id: number, gridId: number, row: number, col: number, width: number, height: number) => {
  const win = windows.get(gridId) || CreateWindow({ font, cell })
  win.setWindowInfo({ id, gridId, row, col, width, height })
  container.appendChild(win.element)
}

export const removeWindow = (gridId: number) => {
  const win = windows.get(gridId)
  if (!win) return console.warn(`trying to destroy a window that does not exist ${gridId}`)

  win.destroy()
  if (container.contains(win.element)) container.removeChild(win.element)
  windows.delete(gridId)
}

export const getWindowCanvas = (gridId: number) => {
  const win = windows.get(gridId)
  if (!win) throw new Error(`trying to get window grid that does not exist ${gridId}`)
  return win.canvas
}

export const getWindowGrid = (gridId: number) => {
  const win = windows.get(gridId)
  if (!win) throw new Error(`trying to get window grid that does not exist ${gridId}`)
  return win.grid
}

export const getWindow = (windowId: number) => {
  // TODO: to be used for adding overlays and whatever other shenanigans.
  // or do we want to write a wrapper methods around the Window object and
  // not expose it directly?
  //
  // here is a case where we need to do a lookup of windows by windowId instead
  // of the default gridId key
  //
  // should we create another map with the windowId as the key or do a find
  // everytime??
}

// TODO: to be called after a redraw event. this recalcs the window grid sizes -> css grid
// + calls nvim api to get window info like title and etc.
export const renderWindows = () => {

}
