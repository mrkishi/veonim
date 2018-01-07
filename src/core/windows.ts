import { CanvasWindow, createWindow } from '../core/canvas-window'
import * as canvasContainer from '../core/canvas-container'
import { throttle, merge, listof } from '../support/utils'
import { getCurrent, current, cmd } from '../core/neovim'
import { cursor, moveCursor } from '../core/cursor'
import * as dispatch from '../messaging/dispatch'
import * as grid from '../core/grid'

export interface VimWindow {
  x: number,
  y: number,
  height: number,
  width: number,
  name: string,
  modified: boolean,
  active: boolean,
  terminal: boolean,
}

export interface RenderWindow extends VimWindow {
  col: {
    start: number,
    end: number,
  },
  row: {
    start: number,
    end: number,
  },
  gridColumn: string,
  gridRow: string,
}

export interface WindowApi {
  modified: boolean,
  active: boolean,
  name?: string,
  terminal: boolean,
  updateBackground(): void,
}

export interface Window {
  element: HTMLElement,
  nameplateBox: HTMLElement,
  nameplate: HTMLElement,
  canvas: CanvasWindow,
  canvasBox: HTMLElement,
  api: WindowApi,
}

interface GridInfo {
  gridTemplateRows: string,
  gridTemplateColumns: string,
  windows: RenderWindow[],
}

const cache = { windows: [] as VimWindow[] }
const container = document.getElementById('windows') as HTMLElement
const specs = {
  gridGap: 2,
  nameplateHeight: canvasContainer.cell.height + 4
}

merge(container.style, {
  flex: 1,
  maxWidth: '100%',
  display: 'grid',
  gridGap: `${specs.gridGap}px`,
  justifyItems: 'stretch',
  alignItems: 'stretch',
})

const createWindowEl = () => {
  const element = document.createElement('div')
  merge(element.style, {
    display: 'none',
    flexFlow: 'column',
    background: 'none',
  })

  const canvasBox = document.createElement('div')
  const titleBar = document.createElement('div')
  const nameplateBox = document.createElement('div')
  const nameplate = document.createElement('div')
  const canvas = createWindow(canvasBox)
  const modifiedBubble = document.createElement('div')
  const terminalIcon = document.createElement('div')

  merge(canvasBox.style, {
    flex: 1,
    overflow: 'hidden',
  })

  merge(titleBar.style, {
    height: `${specs.nameplateHeight}px`,
    minHeight: `${specs.nameplateHeight}px`,
    display: 'flex',
    // TODO: constrain canvasBox (and nameplateBox) to the size of the canvas. NO OVERFLOW
    //whiteSpace: 'nowrap',
    //overflow: 'hidden',
    //textOverflow: 'ellipsis',
  })

  merge(nameplateBox.style, {
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '10px',
    paddingRight: '10px',
  })

  merge(nameplate.style, {
    color: '#aaa',
  })

  merge(modifiedBubble.style, {
    display: 'none',
    marginTop: '2px',
    marginLeft: '8px',
    background: '#aaa',
    borderRadius: '50%',
    height: `${Math.round(canvasContainer.font.size / 2)}px`,
    width: `${Math.round(canvasContainer.font.size / 2)}px`,
  })

  merge(terminalIcon.style, {
    display: 'none',
    marginRight: '8px',
    color: '#aaa',
    alignItems: 'center,'
  })

  terminalIcon.innerHTML = `<svg
    xmlns="http://www.w3.org/2000/svg"
    width="${canvasContainer.font.size + 2}"
    height="${canvasContainer.font.size + 2}"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <polyline points="4 17 10 11 4 5"></polyline>
    <line x1="12" y1="19" x2="20" y2="19"></line>
  </svg>`

  nameplateBox.appendChild(terminalIcon)
  nameplateBox.appendChild(nameplate)
  nameplateBox.appendChild(modifiedBubble)
  titleBar.appendChild(nameplateBox)
  element.appendChild(titleBar)
  element.appendChild(canvasBox)
  container.appendChild(element)

  const api: WindowApi = {
    set modified(yes: boolean) { modifiedBubble.style.display = yes ? 'block' : 'none' },
    set active(yes: boolean) { nameplate.style.filter = `brightness(${yes ? 130 : 90}%)` },
    set name(name: string) { nameplate.innerText = name || '[No Name]'},
    set terminal(yes: boolean) { terminalIcon.style.display = yes ? 'flex' : 'none' },
    updateBackground: () => {
      canvasBox.style.background = current.bg
      nameplateBox.style.background = current.bg
      modifiedBubble.style.background = current.bg
      modifiedBubble.style.filter = `brightness(250%)`
      terminalIcon.style.color = current.bg
      terminalIcon.style.filter = `brightness(250%)`
    },
  }

  return { element, canvas, nameplateBox, nameplate, canvasBox, api }
}

const windows = [ createWindowEl() ]

const getWindows = async (): Promise<VimWindow[]> => {
  const activeWindow = (await getCurrent.window).id
  const wins = await (await getCurrent.tab).windows

  return await Promise.all(wins.map(async w => {
    const [ [ y, x ], buffer ] = await Promise.all([
      w.position,
      w.buffer,
    ])

    return {
      x,
      y,
      active: w.id === activeWindow,
      height: await w.height,
      width: await w.width,
      name: (await buffer.name)
        .replace(current.cwd + '/', '')
        .replace(/^term:\/\/\.\/\/\w+:/, ''),
      modified: await buffer.getOption('modified'),
      terminal: (await buffer.getOption('buftype')) === 'terminal',
    }
  }))
}

export const applyToWindows = (transformFn: (window: CanvasWindow) => void) => windows.forEach(w => transformFn(w.canvas))

// TODO: how to make this even faster? (besides a memory intensive hashtable)
export const getWindow = (targetRow: number, targetCol: number): CanvasWindow | undefined => {
  const winCount = winPos.length
  for (let ix = 0; ix < winCount; ix++) {
    const [ row, col, height, width, canvas ] = winPos[ix]
    if ((row <= targetRow && targetRow < (height + row)) && (col <= targetCol && targetCol < (width + col))) return canvas
  }
}

export const activeWindow = () => getWindow(cursor.row, cursor.col)

const fillCanvasFromGrid = (x: number, y: number, height: number, width: number, canvas: CanvasWindow) => {
  for (let lineIx = y; lineIx < y + height; lineIx++) {
    for (let charIx = x; charIx < x + width; charIx++) {
      const [ ch, fg, bg ] = grid.get(lineIx, charIx)

      canvas
        .setColor(bg)
        .fillRect(charIx, lineIx, 1, 1)
        .setColor(fg)
        .setTextBaseline('top')
        .fillText(ch, charIx, lineIx)
    }
  }
}

const setupWindow = async ({ element, canvas, canvasBox, api }: Window, window: RenderWindow) => {
  merge(element.style, {
    display: 'flex',
    gridColumn: window.gridColumn,
    gridRow: window.gridRow,
  })

  canvas
    .setSpecs(window.y, window.x, window.height, window.width, 10, 6)
    .resize(canvasBox, current.bg)

  winPos.push([window.y, window.x, window.height, window.width, canvas])
  fillCanvasFromGrid(window.x, window.y, window.height, window.width, canvas)

  api.updateBackground()
  merge(api, window)
}

const windowsDimensionsSame = (windows: VimWindow[], previousWindows: VimWindow[]) => windows.every((w, ix) => {
  const lw = previousWindows[ix]
  if (!lw) return false

  return w.x === lw.x &&
    w.y === lw.y &&
    w.height === lw.height &&
    w.width === lw.width
})

const horizontalSpace = (splits: number) => {
  const { width } = container.getBoundingClientRect()
  const { paddingX } = windows[0].canvas.getSpecs()

  const vw = width
  - ((splits + 1) * paddingX * 2)
  - (splits * specs.gridGap)

  return Math.floor(vw / canvasContainer.cell.width)
}

const findWindowsWithDifferentNameplate = (windows: VimWindow[], previousWindows: VimWindow[]) => windows.filter((w, ix) => {
  const lw = previousWindows[ix]
  if (!lw) return false
  return !(w.modified === lw.modified && w.active === lw.active && w.name === lw.name && w.terminal === lw.terminal)
})

const getSplits = (wins: VimWindow[]) => {
  const vertical = new Set<number>()
  const horizontal = new Set<number>()
  wins.forEach(w => (vertical.add(w.x), horizontal.add(w.y)))
  return { vertical, horizontal }
}

const getSplitCount = (wins: VimWindow[]) => {
  const { vertical, horizontal } = getSplits(wins)
  return { vertical: vertical.size - 1, horizontal: horizontal.size - 1 }
}

const gogrid = (wins: VimWindow[]): GridInfo => {
  const totalRows = canvasContainer.size.rows - 1
  const totalColumns = canvasContainer.size.cols
  const { vertical, horizontal } = getSplits(wins)

  vertical.add(totalColumns)
  horizontal.add(totalRows)

  const yrows = [...horizontal].sort((a, b) => a - b)
  const xcols = [...vertical].sort((a, b) => a - b)

  const rr = yrows.reduce((res, curr, ix, arr) => {
    if (ix === arr.length - 1) return res

    const next = arr[ix + 1]
    const diff = next - curr
    const rowSize = Math.round((diff / totalRows) * 100).toFixed(1)
    return [...res, rowSize]
  }, [])

  const cc = xcols.reduce((res, curr, ix, arr) => {
    if (ix === arr.length - 1) return res

    const next = arr[ix + 1]
    const diff = next - curr
    const rowSize = Math.round((diff / totalColumns) * 100).toFixed(1)
    return [...res, rowSize]
  }, [])

  const gridTemplateRows = rr.length < 2 ? '100%' : rr.reduce((s, m) => s + m + '% ', '')
  const gridTemplateColumns = cc.length < 2 ? '100%' : cc.reduce((s, m) => s + m + '% ', '')

  const windowsWithGridInfo = wins.map(w => ({
    ...w,
    col: {
      start: w.x,
      end: w.x + w.width === totalColumns ? w.x + w.width : w.x + w.width + 1,
    },
    row: {
      start: w.y,
      end: w.y + w.height === totalRows ? w.y + w.height : w.y + w.height + 1,
    }
  })).map(w => {
    const rowStart = yrows.indexOf(w.row.start) + 1
    const rowEnd = yrows.indexOf(w.row.end) + 1
    const colStart = xcols.indexOf(w.col.start) + 1
    const colEnd = xcols.indexOf(w.col.end) + 1

    return {
      ...w,
      gridColumn: `${colStart} / ${colEnd}`,
      gridRow: `${rowStart} / ${rowEnd}`,
    }
  })

  return {
    gridTemplateRows,
    gridTemplateColumns,
    windows: windowsWithGridInfo,
  }
}

let winPos = [] as any
let gridResizeInProgress = false
let initialRenderPass = true

export const render = async () => {
  const wins = await getWindows()

  const actualColumns = canvasContainer.size.cols - 1
  const availableColumns = horizontalSpace(getSplitCount(wins).vertical)

  if (!initialRenderPass && availableColumns !== actualColumns && !gridResizeInProgress) {
    gridResizeInProgress = true
    canvasContainer.redoResize(canvasContainer.size.rows, availableColumns + 1)
    cmd(`wincmd =`)
    return
  }

  // TODO: what if we could calculate availableColumns BEFORE hand?
  // it should be deterministic based on the current grid size and canvas-window paddings
  // (how does this help?)

  // TODO: what if we apply a grid resize operation BEFORE the split window event
  // gets sent and processed. how could we intercept and freeze split cmds?
  // api.getUserKeymap? listen for split key events? WinNew autocmd?
  // if resize before, then there won't be a need to wincmd =
  // there will still be some shift, but maybe not so much...

  // TODO: what if resize grid so it will always fit n-windows + 1
  // that is, if there is only 1 window, the grid will be resized to accomodate 2.
  // when 2 happen, they will be resized for 3.

  if (gridResizeInProgress && availableColumns === actualColumns) gridResizeInProgress = false

  if (cache.windows) {
    findWindowsWithDifferentNameplate(wins, cache.windows).forEach(vw => {
      // TODO: this could be better
      const win = windows.find(w => w.canvas.getSpecs().row === vw.y && w.canvas.getSpecs().col === vw.x)
      if (!win) return
      merge(win.api, vw)

      const prevWin = cache.windows.find(w => w.x === vw.x && w.y === vw.y)
      if (prevWin) merge(prevWin, {
        name: vw.name,
        active: vw.active,
        modified: vw.modified,
        terminal: vw.terminal,
      })
    })

    if (windowsDimensionsSame(wins, cache.windows)) return
  }

  cache.windows = wins

  if (wins.length > windows.length) {
    const toCreate = wins.length - windows.length
    windows.push(...listof(toCreate, () => createWindowEl()))
  }

  winPos = []
  const { gridTemplateRows, gridTemplateColumns, windows: renderWindows } = gogrid(wins)
  merge(container.style, { gridTemplateRows, gridTemplateColumns })

  for (let ix = 0; ix < windows.length; ix++) {
    if (ix < cache.windows.length)
      setupWindow(windows[ix], renderWindows[ix])

    else if (windows[ix].element.style.display !== 'none')
      merge(windows[ix].element.style, { display: 'none' })
  }

  setImmediate(() => moveCursor(current.bg))
  initialRenderPass = false
}

dispatch.sub('redraw', throttle(render, 30))
