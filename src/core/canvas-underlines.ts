import * as canvasContainer from '../core/canvas-container'
import * as dispatch from '../messaging/dispatch'
import { getWindow } from '../core/windows'
import { debounce } from '../support/utils'

export interface CanvasUnderline {
  col: number,
  row: number,
  width: number,
  color: string,
}

const container = document.getElementById('canvas-container') as HTMLElement
const canvas = document.createElement('canvas')
const ui = canvas.getContext('2d', { alpha: true }) as CanvasRenderingContext2D

canvas.style.position = 'absolute'
ui.imageSmoothingEnabled = false
canvas.setAttribute('id', 'canvas-underlines')
container.appendChild(canvas)

const cache = {
  lines: [] as CanvasUnderline[]
}

export const resize = () => {
  const { height, width } = container.getBoundingClientRect()

  canvas.height = height * window.devicePixelRatio
  canvas.width = width * window.devicePixelRatio
  canvas.style.height = `${height}px`
  canvas.style.width = `${width}px`

  ui.scale(window.devicePixelRatio, window.devicePixelRatio)
}

const draw = ({ col, row, width, color }: CanvasUnderline) => {
  const win = getWindow(row, col)
  if (!win) return

  // TODO: row needs to be offset relative to the current buffer line...
  const x = win.colToX(col)
  const y = win.rowToY(row) + canvasContainer.cell.height - canvasContainer.cell.padding
  const w = win.cellsToPixelWidth(width)

  ui.beginPath()
  ui.strokeStyle = color
  ui.lineWidth = 1
  ui.moveTo(x, y)
  ui.lineTo(x + w, y)
  ui.stroke()
}

const render = (lines: CanvasUnderline[]) => {
  ui.clearRect(0, 0, canvas.width, canvas.height)
  lines.forEach(draw)
}

export const addUnderlines = (lines: CanvasUnderline[]) => {
  cache.lines = lines
  render(lines)
}

// TODO: would it make sense to do a diff new vs cached before
// render? or would the diff take longer to compute than rerender?
const batchedRender = debounce(() => render(cache.lines), 27)

resize()
canvasContainer.on('resize', resize)
dispatch.sub('redraw', batchedRender)
