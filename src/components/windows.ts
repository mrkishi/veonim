import { as, getCurrent, current } from '../core/neovim'
import { debounce, merge } from '../support/utils'
import * as dispatch from '../messaging/dispatch'
import { px } from '../core/canvasgrid'

export interface VeonimWindow {
  x: number,
  y: number,
  height: number,
  width: number,
  name: string,
}

export interface Window {
  x: string,
  y: string,
  width: string,
  height: string,
  name: string,
}

export interface Nameplate {
  name: string,
  modified: boolean,
  active: boolean,
  x: string,
  y: string,
  width: string,
}

const generateElements = (count = 20) => [...Array(count)]
  .map(() => document.createElement('div'))
  .map(e => (merge(e.style, {
    position: 'absolute',
    display: 'none',
    border: '1px solid cyan',
  }), e))

const container = document.getElementById('windows') as HTMLElement
const elements = generateElements(20)
const nameplates = generateElements(20).map(np => (merge(np.style, {
  border: 'none',
  height: px.row.height(1) + 'px',
  background: '#000',
}), np))

elements.forEach(e => container.appendChild(e))
nameplates.forEach(n => container.appendChild(n))

const getWindows = async (): Promise<VeonimWindow[]> => {
  const wins = await (await getCurrent.tab).windows

  return await Promise.all(wins.map(async w => {
    const [ [ y, x ], buffer ] = await Promise.all([
      w.position,
      as.buf(w.buffer)
    ])

    return {
      x,
      y,
      height: await w.height,
      width: await w.width,
      name: (await buffer.name),
      // TODO: get modified state
      //modified: await buffer.getVar('&modified'),
    }
  }))
}

const asWindow = (w: VeonimWindow): Window => ({
  name: w.name.replace(current.cwd, ''),
  x: px.col.x(w.x) + 'px',
  y: px.row.y(w.y) + 'px',
  width: px.col.width(w.width) + 'px',
  height: px.row.height(w.height) + 'px',
})

const asNameplate = (w: VeonimWindow): Nameplate => ({
  name: w.name.replace(current.cwd, ''),
  active: false,
  modified: false,
  x: px.col.x(w.x) + 'px',
  y: (px.row.y(w.y) + px.row.height(w.height)) + 'px',
  width: px.col.width(w.width) + 'px',
})

const applyWindow = (w: Window, el: HTMLElement): HTMLElement => (merge(el.style, {
  width: w.width,
  height: w.height,
  top: w.y,
  left: w.x,
  display: '',
}), el)

const applyNameplate = (n: Nameplate, el: HTMLElement): HTMLElement => {
  merge(el.style, {
    width: n.width,
    top: n.y,
    left: n.x,
    display: '',
  })

  console.log('name:', n.name)
  el.innerText = n.name
  return el
}

export const render = async () => {
  console.log('render windows pls')
  const vimWindows = await getWindows()
  const windows = vimWindows.map(asWindow)
  const plates = vimWindows.map(asNameplate)

  // TODO: cache the thing and skip render if wins not changed
  // or actually just need to vdom diff lol
  // if props not changed, skip render
  const windowCount = windows.length
  const elCount = elements.length

  console.log('pls render windows:', windows)

  if (windowCount > elCount) {
    const newWinCount = windowCount - elCount
    const newElements = generateElements(newWinCount)
    newElements.forEach(e => container.appendChild(e))
    elements.concat(newElements)
  }

  for (let ix = 0; ix < elCount; ix++) {
    const el = elements[ix]
    const np = nameplates[ix]

    if (ix < windowCount) {
      applyWindow(windows[ix], el)
      applyNameplate(plates[ix], np)
    }

    else {
      if (el.style.display !== 'none') merge(el.style, { display: 'none' })
      if (np.style.display !== 'none') merge(el.style, { display: 'none' })
    }
  }
}

dispatch.sub('redraw', debounce(() => render(), 32))
