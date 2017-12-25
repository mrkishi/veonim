import { CanvasWindow, createWindow } from '../core/canvas-window'
import * as canvasContainer from '../core/canvas-container'
import { getCurrent, current } from '../core/neovim'
import { cursor, moveCursor } from '../core/cursor'
import { debounce, merge } from '../support/utils'
import * as dispatch from '../messaging/dispatch'
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
    display: 'none',
    background: 'none',
    margin: '1px',
  }), e))

const container = document.getElementById('windows') as HTMLElement
// TODO: don't make so many!. just start with 1 and add as created
const windows = generateElements(10).map(e => {
  const canvasBox = document.createElement('div')
  const nameplateBox = document.createElement('div')
  const nameplate = document.createElement('div')
  const canvas = createWindow(canvasBox)

  merge(nameplateBox.style, {
    height: `${canvasContainer.cell.height}px`,
    display: 'flex',
    // TODO: constrain canvasBox (and nameplate) to the size of the canvas. NO OVERFLOW
    //whiteSpace: 'nowrap',
    //overflow: 'hidden',
    //textOverflow: 'ellipsis',
  })

  merge(nameplate.style, {
    display: 'flex',
    'align-items': 'center',
    'padding-left': '10px',
    'padding-right': '10px',
  })

  nameplate.style.color = '#aaa'

  nameplateBox.appendChild(nameplate)
  e.appendChild(nameplateBox)
  e.appendChild(canvasBox)

  return { element: e, canvas, nameplate }
})

windows.forEach(m => container.appendChild(m.element))

merge(container.style, {
  display: 'flex',
  'flex-flow': 'column wrap',
  width: '100%',
  height: '100%',
})

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
      name: (await buffer.name).replace(current.cwd + '/', ''),
      active: (await buffer.id) === currentBuffer,
      modified: (await buffer.getOption('modified')),
    }
  }))
}

export const applyToWindows = (transformFn: (window: CanvasWindow) => void) => windows.forEach(w => transformFn(w.canvas))

const findWindow = (targetRow: number, targetCol: number) => windows.filter(w => w.canvas.isActive()).find(window => {
  const { row, col, height, width } = window.canvas.getSpecs()
  const horizontal = row <= targetRow && targetRow <= (height + row)
  const vertical = col <= targetCol && targetCol <= (width + col)
  return horizontal && vertical
})

export const getWindow = (row: number, column: number): CanvasWindow | undefined =>
  (findWindow(row, column) || {} as any).canvas

export const activeWindow = () => getWindow(cursor.row, cursor.col)

const setupWindow = async (element: HTMLElement, canvas: CanvasWindow, window: VeonimWindow, nameplate: HTMLElement) => {
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

  element.style.display = ''
  nameplate.style.background = current.bg
  nameplate.innerText = window.name
}

let vimWindows: VeonimWindow[]

const windowsDimensionsSame = (windows: VeonimWindow[], previousWindows: VeonimWindow[]) => windows.every((w, ix) => {
  const lw = previousWindows[ix]
  if (!lw) return false

  return w.x === lw.x &&
    w.y === lw.y &&
    w.height === lw.height &&
    w.width === lw.width
})

const findWindowsWithDifferentNameplate = (windows: VeonimWindow[], previousWindows: VeonimWindow[]) => windows.filter((w, ix) => {
  const lw = previousWindows[ix]
  if (!lw) return false
  return w.name !== lw.name
})

export const render = async () => {
  const wins = await getWindows()

  if (vimWindows) {
    findWindowsWithDifferentNameplate(wins, vimWindows).forEach(vw => {
      // TODO: this could be better
      const win = windows.find(w => w.canvas.getSpecs().row === vw.y && w.canvas.getSpecs().col === vw.x)
      if (!win) return
      win.nameplate.innerText = vw.name
      const wwIx = vimWindows.findIndex(w => w.x === vw.x && w.y === vw.y)
      vimWindows[wwIx].name = vw.name
    })

    if (windowsDimensionsSame(wins, vimWindows)) return
  }

  vimWindows = wins

  // TODO: if need to create more
  //if (vimWindows > windows)

  for (let ix = 0; ix < windows.length; ix++) {

    if (ix < vimWindows.length)
      // TODO: just pass the entire window object instead of each prop by itself
      // aka setupWindow(window, vimWindow)
      setupWindow(windows[ix].element, windows[ix].canvas, vimWindows[ix], windows[ix].nameplate)

    else {
      windows[ix].canvas.deactivate()

      if (windows[ix].element.style.display !== 'none')
        merge(windows[ix].element.style, { display: 'none' })
    }
  }

  setImmediate(() => moveCursor())
}

// TODO: maybe use throttle as to be more responsive?
dispatch.sub('redraw', debounce(() => render(), 32))
