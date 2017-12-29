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

export interface Window {
  element: HTMLElement,
  nameplate: HTMLElement,
  canvas: CanvasWindow,
  canvasBox: HTMLElement,
}

interface GridInfo {
  gridTemplateRows: string,
  gridTemplateColumns: string,
  windows: RenderWindow[],
}

const cache = {
  windows: [] as VimWindow[]
}

const createWindowEl = () => {
  const element = document.createElement('div')
  merge(element.style, {
    display: 'none',
    'flex-flow': 'column',
    background: 'none',
  })

  const canvasBox = document.createElement('div')
  const nameplateBox = document.createElement('div')
  const nameplate = document.createElement('div')
  const canvas = createWindow(canvasBox)

  merge(canvasBox.style, {
    flex: 1,
    overflow: 'hidden',
  })

  merge(nameplateBox.style, {
    height: `${canvasContainer.cell.height + 4}px`,
    'min-height': `${canvasContainer.cell.height + 4}px`,
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
  element.appendChild(nameplateBox)
  element.appendChild(canvasBox)
  container.appendChild(element)

  return { element, canvas, nameplate, canvasBox }
}

const container = document.getElementById('windows') as HTMLElement
const windows = [ createWindowEl() ]

merge(container.style, {
  flex: 1,
  display: 'grid',
  'grid-gap': '2px',
  'justify-items': 'stretch',
  'align-items': 'stretch',
})

const getWindows = async (): Promise<VimWindow[]> => {
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
  const horizontal = row <= targetRow && targetRow < (height + row)
  const vertical = col <= targetCol && targetCol < (width + col)
  return horizontal && vertical
})

export const getWindow = (row: number, column: number): CanvasWindow | undefined =>
  (findWindow(row, column) || {} as any).canvas

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

const setupWindow = async ({ element, nameplate, canvas, canvasBox }: Window, window: RenderWindow) => {
  merge(element.style, {
    display: 'flex',
    'grid-column': window.gridColumn,
    'grid-row': window.gridRow,
  })

  canvas
    .setSpecs(window.y, window.x, window.height, window.width, 10, 12)
    .resize(canvasBox, current.bg)

  fillCanvasFromGrid(window.x, window.y, window.height, window.width, canvas)

  canvasBox.style.background = current.bg
  nameplate.style.background = current.bg
  nameplate.innerText = window.name
}

const windowsDimensionsSame = (windows: VimWindow[], previousWindows: VimWindow[]) => windows.every((w, ix) => {
  const lw = previousWindows[ix]
  if (!lw) return false

  return w.x === lw.x &&
    w.y === lw.y &&
    w.height === lw.height &&
    w.width === lw.width
})

const findWindowsWithDifferentNameplate = (windows: VimWindow[], previousWindows: VimWindow[]) => windows.filter((w, ix) => {
  const lw = previousWindows[ix]
  if (!lw) return false
  return w.name !== lw.name
})

const gogrid = (wins: VimWindow[]): GridInfo => {
  const xPoints = new Set<number>()
  const yPoints = new Set<number>()

  const { rows: gridRows, cols: totalColumns } = canvasContainer.size
  const totalRows = gridRows - 1

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

  const gridTemplateRows = rr.reduce((s, m) => s + m + '% ', '')
  const gridTemplateColumns = cc.reduce((s, m) => s + m + '% ', '')

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

export const render = async () => {
  const wins = await getWindows()

  if (cache.windows) {
    findWindowsWithDifferentNameplate(wins, cache.windows).forEach(vw => {
      // TODO: this could be better
      const win = windows.find(w => w.canvas.getSpecs().row === vw.y && w.canvas.getSpecs().col === vw.x)
      if (!win) return
      win.nameplate.innerText = vw.name
      const wwIx = cache.windows.findIndex(w => w.x === vw.x && w.y === vw.y)
      cache.windows[wwIx].name = vw.name
    })

    if (windowsDimensionsSame(wins, cache.windows)) return
  }

  cache.windows = wins

  if (wins.length > windows.length) {
    const toCreate = wins.length - windows.length
    windows.push(...listof(toCreate, () => createWindowEl()))
  }

  const { gridTemplateRows, gridTemplateColumns, windows: renderWindows } = gogrid(wins)
  merge(container.style, { gridTemplateRows, gridTemplateColumns })

  for (let ix = 0; ix < windows.length; ix++) {

    if (ix < cache.windows.length)
      setupWindow(windows[ix], renderWindows[ix])

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
