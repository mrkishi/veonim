import CreateWindow, { Window } from '../core/window'
import { merge } from '../support/utils'
import { font, cell } from '../core/canvas-container'

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

export const updateWindowContents = (gridId: number, contents: any[]) => {
  const win = windows.get(gridId)
  if (!win) throw new Error(`trying to update a window grid that does not exist ${gridId}`)

  // TODO: update the canvas accordingly
  // contents.forEach(c => {
  //   win.canvas.fillText('DO THE NEEDFUL LOL')
  // })
}

// TODO: to be called after a redraw event. this recalcs the window grid sizes -> css grid
// + calls nvim api to get window info like title and etc.
export const render = () => {

}
