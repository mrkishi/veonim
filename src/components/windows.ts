import { CanvasWindow, createWindow } from '../core/canvas-window'
import { debounce, merge } from '../support/utils'
import * as dispatch from '../messaging/dispatch'
import { getCurrent } from '../core/neovim'
import * as vimUI from '../core/canvasgrid'
import * as grid from '../core/grid'

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

export const applyToWindows = (transformFn: (window: CanvasWindow) => void) => windows.forEach(w => transformFn(w))

// TODO: this iterates thru all windows, even those that are not active
export const getWindow = (targetRow: number, targetCol: number) => windows.filter(w => w.isActive()).find(window => {
  const { row, col, height, width } = window.getSpecs()
  //console.log(`S r${row} c${col} h${height} w${width} -> T r${targetRow} c${targetCol}`)
  const horizontal = row <= targetRow && targetRow <= (height + row)
  const vertical = col <= targetCol && targetCol <= (width + col)
  return horizontal && vertical
})

export const getWindowsWhere = (targetRow: number, targetCol: number, targetHeight: number, targetWidth: number) => windows.find(window => {
  const { row, col, height, width } = window.getSpecs()
  const horizontal = row <= targetRow && targetRow <= width
  const vertical = col <= targetCol && targetCol <= height
  console.log('implement', targetHeight, targetWidth)
  // TODO: wut
  return horizontal && vertical
})

const setupWindow = async (element: HTMLElement, canvas: CanvasWindow, window: VeonimWindow) => {
  canvas
    .setSpecs(window.y, window.x, window.height, window.width)
    .resize(window.height, window.width)

  for (let lineIx = window.y; lineIx < window.y + window.height; lineIx++) {
    for (let charIx = window.x; charIx < window.x + window.width; charIx++) {
      const [ ch, fg, bg ] = grid.get(lineIx, charIx)

      canvas
        .setColor(bg)
        .fillRect(charIx, lineIx, 1, 1)
        .setColor(fg)
        .setTextBaseline('top')
        .fillText(ch, charIx, lineIx)
    }
  }

  merge(element.style, {
    // TODO: need to figure out better dynamic positioning
    top: vimUI.px.row.y(window.y) + 'px',
    left: vimUI.px.col.x(window.x) + 'px',
    display: '',
  })
}

let vimWindows: VeonimWindow[]

export const render = async () => {
  const wins = await getWindows()

  if (vimWindows) {
    const same = wins.every((w, ix) => {
      const lw = vimWindows[ix]
      if (!lw) return false

      return w.x === lw.x &&
        w.y === lw.y &&
        w.height === lw.height &&
        w.width === lw.width
    })

    if (same) return
  }

  vimWindows = wins

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
