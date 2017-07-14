import { attach, onRedraw } from '../neovim'
const merge = Object.assign

type ScrollRegion = [number, number, number, number]

interface Colors {
  fg: string,
  bg: string,
  sp: string
}

interface Font {
  height: number,
  width: number,
  lineHeight: number,
  face: string
}

interface GridPos {
  col: number,
  row: number,
  x: number,
  y: number
}

const { devicePixelRatio: pxRatio, innerHeight: winHeight, innerWidth: winWidth } = window
const canvas = document.getElementById('nvim') as HTMLCanvasElement
const ui = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D

const resizeCanvas = (height: number, width: number) => merge(canvas, { height, width })
const updateCursor = ({ row, col }: GridPos) => console.log(`move cursor to ${row} ${col}`)

const sizeToGrid = (height: number, width: number) => ({
  row: Math.floor(height / font.height),
  col: Math.floor(width / font.width)
})

const extendGridToPixels = (obj: { col: number, row: number }): GridPos => merge(obj, {
  get x() { return obj.col * font.width },
  get y() { return obj.row * font.height }
})

const setFontSize = (px: number) => {
  const { lineHeight, face } = font
  const fontHeight = px * (pxRatio || 1)
  ui.font = `${fontHeight}px ${face}`

  const { width } = ui.measureText('m')
  const height = Math.ceil(lineHeight === 1.2
    ? width * 2
    : fontHeight * lineHeight)

  merge(font, { width, height })
  // resize canvas?
}

const api = new Map<string, Function>()
const r = new Proxy(api, {
  set: (_: any, name, fn) => {
    api.set(name as string, fn)
    return true
  }
})

let lastScrollRegion: ScrollRegion | null = null
const colors: Colors = {
  fg: '#fff',
  bg: '#000',
  sp: '#f00'
}

const font: Font = {
  height: 0,
  width: 0,
  lineHeight: 1.2,
  face: 'Roboto Mono'
}

const cursor = extendGridToPixels({ row: 0, col: 0 })
const grid = extendGridToPixels(sizeToGrid(winHeight, winWidth))

const clearBlock = (col: number, row: number, width: number, height: number) =>
  fillBlock(col, row, width, height, colors.bg)

const fillBlock = (col: number, row: number, width: number, height: number, color: string) => {
  const { width: fw, height: fh } = font
  ui.fillStyle = color
  ui.fillRect(col * fw, row * fh, width * fw, height * fh)
}

r.cursor_goto = (m: any[]) => merge(cursor, { x: m[0][1], y: m[0][1] })
r.update_fg = ([ [ fg ] ]: number[][]) => fg > -1 && merge(colors, { fg })
r.update_bg = ([ [ bg ] ]: number[][]) => bg > -1 && merge(colors, { bg })
r.update_sp = ([ [ sp ] ]: number[][]) => sp > -1 && merge(colors, { sp })
r.set_scroll_region = (m: any[]) => lastScrollRegion = m[0]
r.eol_clear = () => clearBlock(cursor.col, cursor.row, grid.col - cursor.col + 1, 1)
r.clear = () => clearBlock(0, 0, grid.col, grid.row)

r.put = (m: any[]) => {
  const total = m.length
  if (!total) return
  clearBlock(cursor.col, cursor.row, total, 1)

  ui.fillStyle = colors.fg

  for (let ix = 0; ix < total; ix++) {
    ui.fillText(m[ix][0], cursor.x, cursor.y)
    cursor.row++
    if (cursor.col > grid.col) {
      cursor.row = 0
      cursor.col++
    }
  }
}

// do the stuffs
resizeCanvas(winHeight, winWidth)
setFontSize(12)

onRedraw((m: any[]) => {
  const count = m.length
  for (let ix = 0; ix < count; ix++) {
    const updates = m[ix]
    const fn = api.get(updates[0])
    fn && fn(updates.slice(1))
  }

  lastScrollRegion = null
  updateCursor(cursor)
})

attach(grid.col, grid.row)
