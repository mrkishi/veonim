import { CanvasWindow, createWindow } from '../core/canvas-window'
import * as canvasContainer from '../core/canvas-container'
import { debounce, merge, listof } from '../support/utils'
import { getCurrent, current } from '../core/neovim'
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
  horizontalSplits: number,
  verticalSplits: number,
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
    updateBackground: () => {
      canvasBox.style.background = current.bg
      nameplateBox.style.background = current.bg
      modifiedBubble.style.background = current.bg
      modifiedBubble.style.filter = `brightness(250%)`
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
      name: (await buffer.name).replace(current.cwd + '/', ''),
      modified: (await buffer.getOption('modified')),
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

const getSizes = (horizontalSplits: number, verticalSplits: number) => {
  const { height, width } = container.getBoundingClientRect()
  const { paddingX, paddingY } = windows[0].canvas.getSpecs()

  const vh = height
    - ((horizontalSplits + 1) * paddingY * 2)
    - (horizontalSplits * (specs.gridGap + specs.nameplateHeight))

  const vw = width
    - ((verticalSplits + 1) * paddingX * 2)
    - (verticalSplits * specs.gridGap)

  const rows = Math.floor(vh / canvasContainer.cell.height)
  const cols = Math.floor(vw / canvasContainer.cell.width)
  const resizeV = rows !== canvasContainer.size.rows
  const resizeH = cols !== canvasContainer.size.cols

  resizeV && console.log('actual rows', rows, 'current:', canvasContainer.size.rows)
  resizeH && console.log('actual cols', cols, 'current:', canvasContainer.size.cols)

  // TODO: hardmode (resizing after is hacky. try before?)
  //if (resizeH) canvasContainer.redoResize(canvasContainer.size.rows, cols)
}

const findWindowsWithDifferentNameplate = (windows: VimWindow[], previousWindows: VimWindow[]) => windows.filter((w, ix) => {
  const lw = previousWindows[ix]
  if (!lw) return false
  return !(w.modified === lw.modified && w.active === lw.active && w.name === lw.name)
})

const gogrid = (wins: VimWindow[]): GridInfo => {
  const xPoints = new Set<number>()
  const yPoints = new Set<number>()
  const totalRows = canvasContainer.size.rows - 1
  const totalColumns = canvasContainer.size.cols

  wins.forEach(w => {
    xPoints.add(w.x)
    yPoints.add(w.y)
  })

  xPoints.add(totalColumns)
  yPoints.add(totalRows)

  const yrows = [...yPoints].sort((a, b) => a - b)
  const xcols = [...xPoints].sort((a, b) => a - b)

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
    // only include positions between container left and right edges (the actual splits)
    horizontalSplits: yrows.length - 2,
    verticalSplits: xcols.length - 2,
    gridTemplateRows,
    gridTemplateColumns,
    windows: windowsWithGridInfo,
  }
}

let winPos = [] as any

export const render = async () => {
  const wins = await getWindows()

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
  const { horizontalSplits, verticalSplits, gridTemplateRows, gridTemplateColumns, windows: renderWindows } = gogrid(wins)
  merge(container.style, { gridTemplateRows, gridTemplateColumns })

  for (let ix = 0; ix < windows.length; ix++) {
    if (ix < cache.windows.length)
      setupWindow(windows[ix], renderWindows[ix])

    else if (windows[ix].element.style.display !== 'none')
      merge(windows[ix].element.style, { display: 'none' })
  }

  setImmediate(() => moveCursor())
  setImmediate(() => getSizes(horizontalSplits, verticalSplits))
}

// TODO: maybe use throttle as to be more responsive?
dispatch.sub('redraw', debounce(() => render(), 32))
