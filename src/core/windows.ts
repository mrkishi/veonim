import { is, throttle, merge, listof, simplifyPath, pathReducer } from '../support/utils'
import { CanvasWindow, createWindow } from '../core/canvas-window'
import * as canvasContainer from '../core/canvas-container'
import { getCurrent, current, cmd } from '../core/neovim'
import { cursor, moveCursor } from '../core/cursor'
import * as dispatch from '../messaging/dispatch'
import { BufferVar } from '../core/vim-functions'
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
  dir?: string,
  termAttached: boolean,
  termFormat: string,
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
  dir?: string,
  terminal: boolean,
  termAttached: boolean,
  termFormat: string,
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

type EL1 = (tagName: string, style: object) => HTMLElement
type EL2 = (style: object) => HTMLElement

export const makel: EL1 & EL2 = (...args: any[]) => {
  const styleObject = args.find(is.object)

  const el = document.createElement(args.find(is.string) || 'div')
  styleObject && merge(el.style, styleObject)

  return el
}

const cache = { windows: [] as VimWindow[] }
const container = document.getElementById('windows') as HTMLElement
const specs = { gridGap: 2 }

merge(container.style, {
  flex: 1,
  maxWidth: '100%',
  display: 'grid',
  gridGap: `${specs.gridGap}px`,
  justifyItems: 'stretch',
  alignItems: 'stretch',
})


const createWindowEl = () => {
  const element = makel({
    display: 'none',
    flexFlow: 'column',
    background: 'none',
  })

  const canvasBox = makel({
    flex: 1,
    overflow: 'hidden',
    background: 'var(--background)',
  })

  const titleBar = makel({
    height: `${canvasContainer.size.nameplateHeight}px`,
    minHeight: `${canvasContainer.size.nameplateHeight}px`,
    display: 'flex',
    overflow: 'hidden',
  })

  const nameplateBox = makel({
    background: 'var(--background)',
    maxWidth: 'calc(100% - 20px)',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '10px',
    paddingRight: '10px',
  })

  const nameplate = makel({
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  })

  const nameplateName = makel('span', {
    color: 'var(--foreground-50)',
  })

  const nameplateDir = makel('span', {
    color: 'var(--foreground-30)',
    marginRight: '1px'
  })

  const readerType = makel({
    color: 'var(--foreground-50)',
    fontSize: `${canvasContainer.font.size - 4}px`,
  })

  const readerIcon = makel({
    color: 'var(--foreground-30)',
    display: 'none',
    marginLeft: '15px',
    marginRight: '4px',
    alignItems: 'center',
  })

  const modifiedBubble = makel({
    background: 'var(--foreground-50)',
    display: 'none',
    marginTop: '2px',
    marginLeft: '8px',
    borderRadius: '50%',
    height: `${Math.round(canvasContainer.font.size / 2)}px`,
    width: `${Math.round(canvasContainer.font.size / 2)}px`,
  })

  const terminalIcon = makel({
    color: 'var(--foreground-30)',
    display: 'none',
    marginRight: '8px',
    alignItems: 'center',
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

  readerIcon.innerHTML = `<svg
    xmlns="http://www.w3.org/2000/svg"
    width="${canvasContainer.font.size - 4}"
    height="${canvasContainer.font.size - 4}"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
  `

  const canvas = createWindow(canvasBox)

  nameplate.appendChild(nameplateDir)
  nameplate.appendChild(nameplateName)
  nameplateBox.appendChild(terminalIcon)
  nameplateBox.appendChild(nameplate)
  nameplateBox.appendChild(modifiedBubble)
  nameplateBox.appendChild(readerIcon)
  nameplateBox.appendChild(readerType)
  titleBar.appendChild(nameplateBox)
  element.appendChild(titleBar)
  element.appendChild(canvasBox)
  container.appendChild(element)

  const api: WindowApi = {
    set modified(yes: boolean) { modifiedBubble.style.display = yes ? 'block' : 'none' },
    // TODO: need to contrast, not brighten
    set active(yes: boolean) { nameplate.style.filter = `brightness(${yes ? 130 : 90}%)` },
    set name(name: string) { nameplateName.innerText = name || '[No Name]' },
    set dir(dir: string) { nameplateDir.innerText =  dir ? `${dir}/` : '' },
    set terminal(yes: boolean) { terminalIcon.style.display = yes ? 'flex' : 'none' },
    set termFormat(name: string) { readerType.innerText = name },
    set termAttached(yes: boolean) {
      readerType.style.display = yes ? 'block' : 'none'
      readerIcon.style.display = yes ? 'flex' : 'none'
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
      name: (simplifyPath(await buffer.name, current.cwd) || '').replace(/^term:\/\/\.\/\/\w+:/, ''),
      modified: await buffer.getOption('modified'),
      terminal: (await buffer.getOption('buftype')) === 'terminal',
      termAttached: await buffer.getVar(BufferVar.TermAttached).catch(() => false),
      termFormat: await buffer.getVar(BufferVar.TermFormat).catch(() => ''),
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
      const [ ch, fg, bg, underline, underlineColor ] = grid.get(lineIx, charIx)

      canvas
        .setColor(bg)
        .fillRect(charIx, lineIx, 1, 1)
        .setColor(fg)
        .setTextBaseline('top')
        .fillText(ch, charIx, lineIx)

      underline && canvas.underline(charIx, lineIx, 1, underlineColor)
    }
  }
}

const setupWindow = ({ element, canvas, canvasBox, api }: Window, window: RenderWindow) => {
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

const availableSpace = (verticalSplits: number, horizontalSplits: number) => {
  const { height, width } = container.getBoundingClientRect()
  const { paddingY, paddingX } = windows[0].canvas.getSpecs()

  const vw = width
  - ((verticalSplits + 1) * paddingX * 2)
  - (verticalSplits * specs.gridGap)

  const vh = height
    - ((horizontalSplits + 1) * paddingY * 2)
    - (horizontalSplits * specs.gridGap)

  const cols = Math.floor(vw / canvasContainer.cell.width)
  const rows = Math.floor(vh / canvasContainer.cell.height)

  return { cols, rows }
}

const findWindowsWithDifferentNameplate = (windows: VimWindow[], previousWindows: VimWindow[]) => windows.filter((w, ix) => {
  const lw = previousWindows[ix]
  if (!lw) return false
  return !(w.modified === lw.modified && w.active === lw.active && w.name === lw.name && w.terminal === lw.terminal && w.dir === lw.dir && w.termAttached === lw.termAttached && w.termFormat === lw.termFormat)
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

const within = (target: number, tolerance: number) => (candidate: number) =>
  Math.abs(target - candidate) <= tolerance

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
  }, [] as string[])

  const cc = xcols.reduce((res, curr, ix, arr) => {
    if (ix === arr.length - 1) return res

    const next = arr[ix + 1]
    const diff = next - curr
    const rowSize = Math.round((diff / totalColumns) * 100).toFixed(1)
    return [...res, rowSize]
  }, [] as string[])

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
    const rowStart = yrows.findIndex(within(w.row.start, 2)) + 1
    const rowEnd = yrows.findIndex(within(w.row.end, 2)) + 1
    const colStart = xcols.findIndex(within(w.col.start, 2)) + 1
    const colEnd = xcols.findIndex(within(w.col.end, 2)) + 1

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

const improvedWindowTitle = (name: string, uniqNames: Set<string>, terminal: boolean) => {
  if (terminal || !name) return { name }

  const uniqueNames = [...uniqNames].filter(m => m !== name)
  const uniqueNameReducers = uniqueNames.map(m => pathReducer(m))
  const nameReducer = pathReducer(name)

  const file = nameReducer.reduce()
  const uniqueFileNames = new Set(uniqueNameReducers.map(m => m.reduce()))

  // TODO: go n-levels deeper
  return { name: file, dir: uniqueFileNames.has(file) ? nameReducer.reduce() : undefined }
}

const betterTitles = (windows: VimWindow[]): VimWindow[] => {
  const uniqNames = new Set(windows.map(w => w.name))
  return windows.map(w => ({ ...w, ...improvedWindowTitle(w.name, uniqNames, w.terminal) }))
}

let winPos = [] as any
let gridResizeInProgress = false

export const render = async () => {
  const ws = await getWindows()

  const { vertical, horizontal } = getSplitCount(ws)
  const { cols: availCols, rows: availRows } = availableSpace(vertical, horizontal)

  const colsOk = within(availCols, 1)(canvasContainer.size.cols - 1)
  const rowsOk = within(availRows, 2)(canvasContainer.size.rows - 1)
  const needsResize = !colsOk || !rowsOk

  if (needsResize && !gridResizeInProgress) {
    gridResizeInProgress = true
    canvasContainer.redoResize(availRows - 1, availCols + 1)
    cmd(`wincmd =`)
    return
  }

  if (gridResizeInProgress && !needsResize) {
    gridResizeInProgress = false
    dispatch.pub('windows:resize.fit')
  }

  const wins = betterTitles(ws)

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
        termAttached: vw.termAttached,
        termFormat: vw.termFormat,
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
  setImmediate(() => dispatch.pub('windows:redraw'))
}

dispatch.sub('redraw', throttle(render, 30))
