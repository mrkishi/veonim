import { as, getCurrent, current } from '../core/neovim'
import { debounce, merge } from '../support/utils'
import * as dispatch from '../messaging/dispatch'
import { px } from '../core/canvasgrid'

export interface Window {
  x: number,
  y: number,
  height: number,
  width: number,
  name: string,
}

export interface VeonimWindow {
  x: string,
  y: string,
  width: string,
  height: string,
  name: string,
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

elements.forEach(e => container.appendChild(e))

const getWindows = async (): Promise<Window[]> => {
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

const asWindow = (w: Window): VeonimWindow => ({
  name: w.name.replace(current.cwd, ''),
  x: px.col.x(w.x) + 'px',
  y: px.row.y(w.y) + 'px',
  width: px.col.width(w.width) + 'px',
  height: px.row.height(w.height) + 'px',
})

export const render = async () => {
  console.log('render windows pls')
  const windows = (await getWindows()).map(asWindow)
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

    if (ix < windowCount) {
      const { width, height, x, y } = windows[ix]
      merge(el.style, {
        width,
        height,
        top: y,
        left: x,
        display: '',
      })
    }

    else {
      if (el.style.display !== 'none') merge(el.style, { display: 'none' })
    }
  }
}

dispatch.sub('redraw', debounce(() => render(), 32))
