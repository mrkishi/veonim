import { partialFill, translate, setVar } from '../ui/css'
import { merge } from '../support/utils'

interface Grid {
  rows: number,
  cols: number,
}

interface Cursor {
  row: number,
  col: number,
  color: string,
}

export enum CursorShape {
  block,
  line,
  underline
}

export interface TransferRegion {
  width: number,
  height: number,
  source: {
    row: number,
    col: number,
  },
  destination: {
    row: number,
    col: number,
  },
}

export interface CanvasGrid {
  rowToY(row: number): number,
  colToX(col: number): number,
  resize(): CanvasGrid,
  setCursorColor(color: string): CanvasGrid,
  setCursorShape(type: CursorShape, size?: number): CanvasGrid,
  hideCursor(): CanvasGrid,
  showCursor(): CanvasGrid,
  moveCursor(): CanvasGrid,
  moveRegion(region: TransferRegion): CanvasGrid,
  putImageData(data: ImageData, col: number, row: number, width: number, height: number): CanvasGrid,
  getImageData(col: number, row: number, width: number, height: number): ImageData,
  fillText(text: string, col: number, row: number): CanvasGrid,
  fillRect(col: number, row: number, width: number, height: number): CanvasGrid,
  setTextBaseline(mode: string): CanvasGrid,
  clear(): CanvasGrid,
  setColor(color: string): CanvasGrid,
  setFont(params: { size?: number, face?: string, lineHeight?: number }): CanvasGrid,
  readonly cols: number,
  readonly rows: number,
  cursor: Cursor
}

const container = document.getElementById('canvas-container') as HTMLElement
const cursorEl = document.getElementById('cursor') as HTMLElement
const canvas = document.getElementById('nvim') as HTMLCanvasElement
const ui = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D
const font = { face: 'Courier New', size: 12, lineHeight: 1.5 }
const actualSize = { width: 0, height: 0 }
const cell = { width: 0, height: 0, padding: 0 }
const cursor = { row: 0, col: 0, color: '#fff' }
const grid = { rows: 0, cols: 0 }
ui.imageSmoothingEnabled = false

// TODO: explore:
// -- setTransform for scaling? might remove manual scaling calcs?

const sizeToGrid = (height: number, width: number): Grid => ({
  rows: Math.floor(height / cell.height),
  cols: Math.floor(width / cell.width),
})

// TODO: memoize
export const px = {
  row: {
    height: (row: number, scaled = false) => Math.floor(row * cell.height * (scaled ? window.devicePixelRatio : 1)),
    y: (rows: number, scaled = false) => px.row.height(rows, scaled) + (scaled ? window.devicePixelRatio : 1),
  },
  col: {
    width: (col: number, scaled = false) => Math.floor(col * cell.width * (scaled ? window.devicePixelRatio : 1)),
    x: (cols: number, scaled = false) => px.col.width(cols, scaled) + (scaled ? window.devicePixelRatio : 1),
  }
}

const api = {
  cursor,
  get cols () { return grid.cols },
  get rows () { return grid.rows },
} as CanvasGrid

api.rowToY = row => px.row.y(row)
api.colToX = col => px.col.x(col)

api.resize = () => {
  const { width, height } = container.getBoundingClientRect()
  merge(actualSize, { width, height })

  canvas.height = height * window.devicePixelRatio
  canvas.width = width * window.devicePixelRatio
  canvas.style.height = `${height}px`
  canvas.style.width = `${width}px`

  ui.scale(window.devicePixelRatio, window.devicePixelRatio)
  merge(grid, sizeToGrid(height, width))

  // setting canvas properties resets font. we need user to call setFont() first to
  // be able to calculate sizeToGrid() based on font size. but because font is reset
  // we will set the font again here
  ui.font = `${font.size}px ${font.face}`
  return api
}

api.setFont = ({ size = font.size, face = font.face, lineHeight = font.lineHeight }) => {
  ui.font = `${size}px ${face}`
  setVar('font', face)
  setVar('font-size', size)
  setVar('line-height', lineHeight)
  merge(font, { size, face, lineHeight })
  merge(cell, { width: Math.floor(ui.measureText('m').width), height: Math.floor(size * lineHeight) })
  cell.padding = Math.floor((cell.height - font.size) / 2)
  return api
}

api.setColor = color => (ui.fillStyle = color, api)
api.clear = () => (ui.fillRect(0, 0, actualSize.width, actualSize.height), api)
api.setTextBaseline = mode => (ui.textBaseline = mode, api)
api.fillText = (m, c, r) => (ui.fillText(m, px.col.x(c), px.row.y(r) + cell.padding), api)
api.fillRect = (c, r, w, h) => (ui.fillRect(px.col.x(c), px.row.y(r), px.col.width(w), px.row.height(h)), api)

api.moveRegion = ({ width, height, source, destination }) => {
  // TODO: what about dat safeHeight used in the get/put imageData fns?
  const srcX = px.col.x(source.col, true)
  const srcY = px.row.y(source.row, true)
  const srcWidth = px.col.width(width, true)
  const srcHeight = px.row.height(height, true)

  const destX = px.col.x(destination.col)
  const destY = px.row.y(destination.row)
  const destWidth = px.col.width(width)
  const destHeight = px.row.height(height)

  ui.drawImage(ui.canvas, srcX, srcY, srcWidth, srcHeight, destX, destY, destWidth, destHeight)

  return api
}

api.getImageData = (col, row, width, height) => {
  return ui.getImageData(px.col.x(col, true), px.row.y(row, true), px.col.width(width, true), px.row.height(height, true))
}

api.putImageData = (data, col, row, width, height) => {
  const safeHeight = row + height >= grid.rows ? grid.rows - row : height
  ui.putImageData(data, px.col.x(col, true), px.row.y(row, true), 0, 0, px.col.width(width, true), px.row.height(safeHeight, true))
  return api
}

api.setCursorShape = (type, size = 20) => {
  if (type === CursorShape.block) merge(cursorEl.style, {
    'mix-blend-mode': 'overlay',
    background: cursor.color,
    height: `${px.row.height(1)}px`,
    width: `${px.col.width(1)}px`
  })

  if (type === CursorShape.line) merge(cursorEl.style, {
    'mix-blend-mode': 'normal',
    background: cursor.color,
    height: `${px.row.height(1)}px`,
    width: `${px.col.width(+(size / 100).toFixed(2))}px`
  })

  if (type === CursorShape.underline) merge(cursorEl.style, {
    'mix-blend-mode': 'normal',
    background: partialFill('horizontal', cursor.color, size),
    height: `${px.row.height(1)}px`,
    width: `${px.col.width(1)}px`
  })

  return api
}

api.setCursorColor = c => (cursor.color = c, cursorEl.style.background = c, api)
api.hideCursor = () => (merge(cursorEl.style, { display: 'none' }), api)
api.showCursor = () => (merge(cursorEl.style, { display: 'block' }), api)
api.moveCursor = () => (cursorEl.style.transform = translate(px.col.x(cursor.col), px.row.y(cursor.row)), api)

// TODO: ghetto constructor... lol
api.setFont({})

export default api
