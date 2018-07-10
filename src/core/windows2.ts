import getWindowMetadata from '../core/window-metadata'
import CreateWindow, { Window } from '../core/window'
import windowSizer from '../core/window-sizer'
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

export const renderWindows = async () => {
  const wininfos = [...windows.values()].map(win => ({ ...win.getWindowInfo() }))
  const { gridTemplateRows, gridTemplateColumns, windowGridInfo } = windowSizer(wininfos)

  merge(container.style, { gridTemplateRows, gridTemplateColumns })

  windowGridInfo.forEach(w => {
    const win = getWindow(w.gridId)
    win.applyGridStyle({ gridRow: w.gridRow, gridColumn: w.gridColumn })
  })

  const winMeta = await getWindowMetadata()
  console.log('ww', ...winMeta)

  // TODO: update nameplates with win metadata
}
