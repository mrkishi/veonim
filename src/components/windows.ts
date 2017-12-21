import { CanvasWindow, createWindow } from '../core/canvas-window'
import { debounce, merge } from '../support/utils'
import * as dispatch from '../messaging/dispatch'
import { getCurrent } from '../core/neovim'
import * as vimUI from '../core/canvasgrid'

export interface VeonimWindow {
  x: number,
  y: number,
  height: number,
  width: number,
  name: string,
  modified: boolean,
  active: boolean,
}

const generateElements = (count = 20) => [...Array(count)]
  .map(() => document.createElement('div'))
  .map(e => (merge(e.style, {
    position: 'absolute',
    display: 'none',
    background: 'none',
  }), e))

const container = document.getElementById('windows') as HTMLElement
const windowsEl = generateElements(10).map(e => (merge(e.style, { border: '1px solid green' }), e))
const windows = windowsEl.map(e => createWindow(e))

windowsEl.forEach(e => container.appendChild(e))

const getWindows = async (): Promise<VeonimWindow[]> => {
  const currentBuffer = (await getCurrent.buffer).id
  const wins = await (await getCurrent.tab).windows

  return await Promise.all(wins.map(async w => {
    const [ [ y, x ], buffer ] = await Promise.all([
      w.position,
      w.buffer,
    ])

    return {
      x,
      y,
      height: await w.height,
      width: await w.width,
      name: (await buffer.name),
      active: (await buffer.id) === currentBuffer,
      modified: (await buffer.getOption('modified')),
    }
  }))
}

const setupWindow = (element: HTMLElement, canvas: CanvasWindow, window: VeonimWindow) => {
  canvas
    .resize(window.height, window.width)
    .setOffset(window.y, window.x)

  merge(element.style, {
    // TODO: need to figure out better dynamic positioning
    top: vimUI.px.row.y(window.y) + 'px',
    left: vimUI.px.col.x(window.x) + 'px',
    display: '',
  })
}

export const render = async () => {
  const vimWindows = await getWindows()
  vimWindows.forEach(w => console.log(w))

  // TODO: if need to create more
  //if (vimWindows > windows)

  for (let ix = 0; ix < windowsEl.length; ix++) {
    const el = windowsEl[ix]

    if (ix < vimWindows.length) {
      setupWindow(el, windows[ix], vimWindows[ix])
    }

    else {
      if (el.style.display !== 'none') merge(el.style, { display: 'none' })
    }
  }
}

// TODO: yeah maybe not
dispatch.sub('redraw', debounce(() => render(), 32))
