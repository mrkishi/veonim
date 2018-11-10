import CreateWebGLRenderer, { WebGLRenderer } from '../render/webgl'
import getWindowMetadata from '../core/window-metadata'
import CreateWindow, { Window } from '../core/window'
import { merge, throttle } from '../support/utils'
import windowSizer from '../core/window-sizer'

const container = document.getElementById('windows') as HTMLElement
const webglContainer = document.getElementById('webgl') as HTMLElement

merge(webglContainer.style, {
  width: '100%',
  height: '100%',
  flex: 1,
  zIndex: 2,
  position: 'absolute',
  background: 'var(--background-30)',
})

merge(container.style, {
  position: 'absolute',
  flex: 1,
  zIndex: 5,
  maxWidth: '100%',
  display: 'grid',
  gridGap: '2px',
  justifyItems: 'stretch',
  alignItems: 'stretch',
  background: 'none',
})

const webgl = CreateWebGLRenderer()
const windows = new Map<number, Window>()
const windowsById = new Map<number, Window>()
const activeGrid = { id: 1, row: 0, col: 0 }

webgl.backgroundElement.setAttribute('wat', 'webgl-background')
webgl.foregroundElement.setAttribute('wat', 'webgl-foreground')

Object.assign(webgl.backgroundElement.style, {
  position: 'absolute',
  zIndex: 3,
})

Object.assign(webgl.foregroundElement.style, {
  position: 'absolute',
  zIndex: 4,
})

webglContainer.appendChild(webgl.backgroundElement)
webglContainer.appendChild(webgl.foregroundElement)

const ro = new ResizeObserver(([ e ]) => {
  webgl.resize(e.width, e.height)
})

ro.observe(webglContainer)

export const setActiveGrid = (id: number, row: number, col: number) => merge(activeGrid, { id, row, col })

export const getActive = () => get(activeGrid.id)

export const set = (id: number, gridId: number, row: number, col: number, width: number, height: number) => {
  const win = windows.get(gridId) || CreateWindow()
  win.setWindowInfo({ id, gridId, row, col, width, height })
  if (!windows.has(gridId)) windows.set(gridId, win)
  if (!windowsById.has(id)) windowsById.set(id, win)
  container.appendChild(win.element)
}

export const remove = (gridId: number) => {
  const win = windows.get(gridId)
  if (!win) return console.warn(`trying to destroy a window that does not exist ${gridId}`)

  win.destroy()
  if (container.contains(win.element)) container.removeChild(win.element)
  windowsById.delete(win.getWindowInfo().id)
  windows.delete(gridId)
}

export const get = (gridId: number) => {
  const win = windows.get(gridId)
  if (!win) throw new Error(`trying to get window that does not exist ${gridId}`)
  return win
}

export const getAll = () => [...windows.values()]

export const has = (gridId: number) => windows.has(gridId)

const getWindowById = (windowId: number) => {
  const win = windowsById.get(windowId)
  if (!win) throw new Error(`trying to get window that does not exist ${windowId}`)
  return win
}

export const render = () => {
  const wininfos = [...windows.values()].map(win => ({ ...win.getWindowInfo() }))
  const { gridTemplateRows, gridTemplateColumns, windowGridInfo } = windowSizer(wininfos)

  merge(container.style, { gridTemplateRows, gridTemplateColumns })

  windowGridInfo.forEach(({ gridId, gridRow, gridColumn }) => {
    get(gridId).applyGridStyle({ gridRow, gridColumn })
  })
}

const updateWindowNameplates = async () => {
  const windowsWithMetadata = await getWindowMetadata()
  windowsWithMetadata.forEach(w => getWindowById(w.id).updateNameplate(w))
}

export const refresh = throttle(updateWindowNameplates, 5)
