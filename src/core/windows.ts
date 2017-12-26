import { CanvasWindow, createWindow } from '../core/canvas-window'
import * as canvasContainer from '../core/canvas-container'
import { uuid, debounce, merge } from '../support/utils'
import { getCurrent, current } from '../core/neovim'
import { cursor, moveCursor } from '../core/cursor'
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

// TODO: what if instead of setting canvas div container width+heights explicitly
// calculate percentages as used in the entire grid. then render percentages. canvas inherits size
// from div. vim w+h defined as minimum. can scroll canvas overflow into view as scrolling down/up
// this would solve the mismatched window sizes giving edges bad 

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
  //'flex-flow': 'row wrap',
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
      genid: uuid(),
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

  const heightRaw = parseInt(canvas.height.replace('px', ''))
  element.style.width = canvas.width
  element.style.height = `${heightRaw + canvasContainer.cell.height}px`
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

const gogrid = (wins: VeonimWindow[]) => {
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

  console.log('rows:', yrows)
  console.log('cols:', xcols)

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

  console.log('gtr:', gridTemplateRows)
  console.log('gtc:', gridTemplateColumns)

  const www = wins.map(w => ({
    ...w,
    col: {
      start: w.x,
      end: w.x + w.width === totalColumns ? w.x + w.width : w.x + w.width + 1,
    },
    row: {
      start: w.y,
      end: w.y + w.height === totalRows ? w.y + w.height : w.y + w.height + 1,
    }
  }))

  const ddd = www.map(w => {
    const rowStart = yrows.indexOf(w.row.start) + 1
    const rowEnd = yrows.indexOf(w.row.end) + 1
    const colStart = xcols.indexOf(w.col.start) + 1
    const colEnd = xcols.indexOf(w.col.end) + 1

    return {
      ...w,
      'grid-column': `${colStart} / ${colEnd}`,
      'grid-row': `${rowStart} / ${rowEnd}`,
    }
  })

  www.forEach(m => console.log(`row: ${m.row.start}-${m.row.end} col: ${m.col.start}-${m.col.end}`))
  ddd.forEach(m => console.log(m))
}

export const render = async () => {
  const wins = await getWindows()
  gogrid(wins)

  if (vimWindows) {
    findWindowsWithDifferentNameplate(wins, vimWindows).forEach(vw => {
      // TODO: this could be better
      const win = windows.find(w => w.canvas.getSpecs().row === vw.y && w.canvas.getSpecs().col === vw.x)
      if (!win) return
      win.nameplate.innerText = vw.name
      // TODO: use genid
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
