import { gradient, translate } from './css'
import { merge, mergeValid } from '../utils'

interface Font { face: string, size: number, lineHeight: number }
interface Cell { width: number, height: number }
interface Grid { rows: number, cols: number }
interface Cursor { row: number, col: number, color: string }
interface Margins { top: number, bottom: number, left: number, right: number }
type MarginParams = { left?: number, right?: number, top?: number, bottom?: number }
export enum CursorShape { block, line, underline }

export interface Api {
  setMargins(margins: MarginParams): Api,
  resize(pixelHeight: number, pixelWidth: number): Api,
  setCursorColor(color: string): Api,
  setCursorShape(type: CursorShape, size?: number): Api,
  moveCursor(): Api,
  putImageData(data: ImageData, col: number, row: number, width: number, height: number): Api,
  getImageData(col: number, row: number, width: number, height: number): ImageData,
  fillText(text: string, col: number, row: number): Api,
  fillRect(col: number, row: number, width: number, height: number): Api,
  setTextBaseline(mode: string): Api,
  clear(): Api,
  setColor(color: string): Api,
  setFont(params: { size?: number, face?: string, lineHeight?: number }): Api,
  readonly cols: number,
  readonly rows: number,
  cursor: Cursor
}

export default ({ canvasId, cursorId }: { canvasId: string, cursorId: string }) => {
  const cursorEl = document.getElementById(cursorId) as HTMLElement
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement
  const ui = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D
  const ratio = window.devicePixelRatio

  const font: Font = { face: 'Courier New', size: 12, lineHeight: 1.5 }
  const actualSize: Cell = { width: 0, height: 0 }
  const cell: Cell = { width: 0, height: 0 }
  const cursor: Cursor = { row: 0, col: 0, color: '#fff' }
  const grid: Grid = { rows: 0, cols: 0 }
  const margins: Margins = { top: 6, bottom: 6, left: 6, right: 6 }

  const sizeToGrid = (height: number, width: number): Grid => ({
    rows: Math.floor((height - (margins.top + margins.bottom)) / cell.height),
    cols: Math.floor((width - (margins.left + margins.right)) / cell.width)
  })

  // TODO: memoize
  const px = {
    row: {
      height: (row: number, scaled = false) => row * cell.height * (scaled ? ratio : 1),
      y: (rows: number, scaled = false) => px.row.height(rows, scaled) + (margins.top * (scaled ? ratio : 1))
    },
    col: {
      width: (col: number, scaled = false) => col * cell.width * (scaled ? ratio : 1),
      x: (cols: number, scaled = false) => px.col.width(cols, scaled) + (margins.left * (scaled ? ratio : 1))
    }
  }

  const api = {
    cursor,
    get cols () { return grid.cols },
    get rows () { return grid.rows }
  } as Api

  api.setMargins = ({ left, right, top, bottom }: MarginParams) => {
    mergeValid(margins, { left, right, top, bottom })
    return api
  }

  api.resize = (pixelHeight: number, pixelWidth: number) => {
    console.log('resize')
    merge(actualSize, { width: pixelWidth, height: pixelHeight })

    canvas.height = pixelHeight * 2
    canvas.width = pixelWidth * 2
    canvas.style.height = `${pixelHeight}px`
    canvas.style.width = `${pixelWidth}px`

    ui.scale(ratio, ratio)
    merge(grid, sizeToGrid(pixelHeight, pixelWidth))

    // setting canvas properties resets font. we need user to call setFont() first to
    // be able to calculate sizeToGrid() based on font size. but because font is reset
    // we will set the font again here
    ui.font = `${font.size}px ${font.face}`
    return api
  }

  api.setFont = ({ size = font.size, face = font.face, lineHeight = font.lineHeight }) => {
    ui.font = `${size}px ${face}`
    merge(font, { size, face, lineHeight })
    merge(cell, { width: ui.measureText('m').width, height: Math.ceil(size * lineHeight) })
    return api
  }

  api.setColor = (color: string) => {
    ui.fillStyle = color
    return api
  }

  api.clear = () => {
    console.log('clear')
    ui.fillRect(0, 0, actualSize.width, actualSize.height)
    return api
  }

  api.setTextBaseline = (mode: string) => {
    ui.textBaseline = mode
    return api
  }

  api.fillRect = (col: number, row: number, width: number, height: number) => {
    ui.fillRect(px.col.x(col), px.row.y(row), px.col.width(width), px.row.height(height))
    return api
  }

  api.fillText = (text: string, col: number, row: number) => {
    ui.fillText(text, px.col.x(col), px.row.y(row) + px.row.height(1))
    return api
  }  

  api.getImageData = (col: number, row: number, width: number, height: number): ImageData => {
    return ui.getImageData(px.col.x(col, true), px.row.y(row, true), px.col.width(width, true), px.row.height(height, true))
  }

  api.putImageData = (data: ImageData, col: number, row: number, width: number, height: number) => {
    const safeHeight = row + height >= grid.rows ? grid.rows - row : height
    ui.putImageData(data, px.col.x(col, true), px.row.y(row, true), 0, 0, px.col.width(width, true), px.row.height(safeHeight, true))
    return api
  }


  api.moveCursor = () => {
    cursorEl.style.transform = translate(px.col.x(cursor.col), px.row.y(cursor.row))
    return api
  }

  api.setCursorShape = (type: CursorShape, size = 20) => {
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
      background: gradient(0, cursor.color, size, 'rgba(0,0,0,0)', 0),
      height: `${px.row.height(1)}px`,
      width: `${px.col.width(1)}px`
    })

    return api
  }

  api.setCursorColor = (color: string) => {
    cursor.color = color
    cursorEl.style.background = color
    return api
  }

  return api
}
