import CreateWindow, { Window } from '../core/window'
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

const windows = new Map<number, Window>()
const activeGrid = { id: 1, row: 0, col: 0 }

export const setActiveGrid = (id: number, row: number, col: number) => merge(activeGrid, { id, row, col })

export const getActiveWindow = () => getWindow(activeGrid.id)

export const setWindow = (id: number, gridId: number, row: number, col: number, width: number, height: number) => {
  const win = windows.get(gridId) || CreateWindow()
  win.setWindowInfo({ id, gridId, row, col, width, height })
  if (!windows.has(gridId)) windows.set(gridId, win)
  container.appendChild(win.element)
}

export const removeWindow = (gridId: number) => {
  const win = windows.get(gridId)
  if (!win) return console.warn(`trying to destroy a window that does not exist ${gridId}`)

  win.destroy()
  if (container.contains(win.element)) container.removeChild(win.element)
  windows.delete(gridId)
}

export const getWindow = (gridId: number) => {
  const win = windows.get(gridId)
  if (!win) throw new Error(`trying to get window that does not exist ${gridId}`)
  return win
}

//export const getWindowById = (windowId: number) => {
//  // TODO: to be used for adding overlays and whatever other shenanigans.
//  // or do we want to write a wrapper methods around the Window object and
//  // not expose it directly?
//  //
//  // here is a case where we need to do a lookup of windows by windowId instead
//  // of the default gridId key
//  //
//  // should we create another map with the windowId as the key or do a find
//  // everytime??
//}

// TODO: to be called after a redraw event. this recalcs the window grid sizes -> css grid
// + calls nvim api to get window info like title and etc.
export const renderWindows = () => {
  const winpos = [...windows].map(([ id, win ]) => ({ id, ...win.getWindowSizeAndPosition() }))
  console.log('winpos', ...winpos)

  // TODO: call nvim_api for nameplate stuff
}
