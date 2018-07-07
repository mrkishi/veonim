import { merge } from '../support/utils'
import { makel } from '../ui/vanilla'

const container = document.getElementById('windows') as HTMLElement

merge(container.style, {
  flex: 1,
  maxWidth: '100%',
  display: 'grid',
  gridGap: '2px',
  justifyItems: 'stretch',
  alignItems: 'stretch',
})

interface Window {
  id: number
  gridId: number
  row: number
  col: number
  width: number
  height: number
}

const windows = new Map<number, Window>()

const createWindow = () => {

}

export const setWindowGridSize = (gridId: number, width: number, height: number) => {

}

export const setWindow = (id: number, gridId: number, row: number, col: number, width: number, height: number) => {

}

export const removeWindow = (gridId: number) => {
  // TODO: cleanup htmls
  // const win = windows.get(gridId)

  windows.delete(gridId)
}

export const updateWindowContents = (gridId: number, contents: any[]) => {
  const win = windows.get(gridId)

}

// TODO: to be called after a redraw event. this recalcs the window grid sizes -> css grid
// + calls nvim api to get window info like title and etc.
export const render = () => {

}
