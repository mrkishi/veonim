import * as canvasContainer from '../core/canvas-container'
import { TransferRegion } from '../core/canvas-window'
import { activeWindow } from '../core/windows'
import { merge } from '../support/utils'

const canvas = document.createElement('canvas')
const ui = canvas.getContext('2d', { alpha: true }) as CanvasRenderingContext2D

merge(canvas.style, {
  position: 'absolute',
  'z-index': 110,
  width: '100%',
  height: '100%',
})

const container = document.getElementById('canvas-container') as HTMLElement
container.appendChild(canvas)

const resize = () => {
  ui.canvas.height = canvasContainer.size.height * window.devicePixelRatio
  ui.canvas.width = canvasContainer.size.width * window.devicePixelRatio
  ui.font = `${canvasContainer.font.size}px ${canvasContainer.font.face}`
  ui.scale(window.devicePixelRatio, window.devicePixelRatio)
}

const gps = (row: number, col: number, width: number, height: number, scaled = false) => {
  const win = activeWindow()
  if (!win) return
  const x = win.colToX(col) * (scaled ? window.devicePixelRatio : 1)
  const y = win.rowToY(row) * (scaled ? window.devicePixelRatio : 1)
  const ww = Math.floor(width * canvasContainer.cell.width * (scaled ? window.devicePixelRatio : 1))
  const hh = Math.floor(height * canvasContainer.cell.height * (scaled ? window.devicePixelRatio : 1))
  return { x, y, width: ww, height: hh }
}

export const clear = (row: number, col: number, width: number, height: number) => {
  const pos = gps(row, col, width, height)
  if (!pos) return
  ui.clearRect(pos.x, pos.y, pos.width, pos.height)
}

export const clearAll = () => ui.clearRect(0, 0, canvas.width, canvas.height)

export const clearLine = (row: number, col: number) => {
  const pos = gps(row, col, 1, 1)
  if (!pos) return
  ui.clearRect(pos.x, pos.y, canvas.width - pos.x, pos.height)
}

export const drawLine = (row: number, col: number, width: number) => {
  const pos = gps(row, col, width, 1)
  if (!pos) return

  ui.fillStyle = '#fff000'
  ui.fillRect(pos.x, pos.y + (canvasContainer.cell.height), pos.width, 1)
}

export const moveRegion = ({ width, height, source, destination }: TransferRegion) => {
  const s = gps(source.row, source.col, width, height, true)
  const d = gps(destination.row, destination.col, width, height)
  if (!s || !d) return

  ui.drawImage(ui.canvas, s.x, s.y, s.width, s.height, d.x, d.y, d.width, d.height)
}

resize()
canvasContainer.on('resize', resize)
canvasContainer.on('font', resize)
