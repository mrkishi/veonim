import CreateCanvasBuffer from '../render/canvas-grid-buffer'
import { cell, font, pad } from '../core/canvas-container'
import nvim from '../core/neovim'

const lindt = () => {
  const canvas = document.createElement('canvas')
  const ui = canvas.getContext('2d', { alpha: true }) as CanvasRenderingContext2D
  const gridBuffer = CreateCanvasBuffer()

  ui.imageSmoothingEnabled = false
  ui.font = `${font.size}px ${font.size}`

  const px = {
    row: {
      height: (row: number, scaled = false) => {
        return Math.floor(row * cell.height * (scaled ? window.devicePixelRatio : 1))
      },
      y: (row: number, scaled = false) => {
        return px.row.height(row, scaled) + (pad.y * (scaled ? window.devicePixelRatio : 1))
      },
    },
    col: {
      width: (col: number, scaled = false) => {
        return Math.floor(col * cell.width * (scaled ? window.devicePixelRatio : 1))
      },
      x: (col: number, scaled = false) => {
        return px.col.width(col, scaled) + (pad.x * (scaled ? window.devicePixelRatio : 1))
      },
    }
  }

  const resize = (rows: number, cols: number) => {
    const height = px.row.height(rows) + (pad.y * 2)
    const width = px.col.width(cols) + (pad.x * 2)

    canvas.height = Math.round(height * window.devicePixelRatio)
    canvas.width = Math.round(width * window.devicePixelRatio)
    canvas.style.height = `${height}px`
    canvas.style.width = `${width}px`

    // setting canvas properties resets font. need to reset it here
    ui.font = `${font.size}px ${font.face}`
    ui.textBaseline = 'top'
    ui.scale(window.devicePixelRatio, window.devicePixelRatio)
    ui.fillStyle = nvim.state.background
    ui.fillRect(0, 0, canvas.width, canvas.height)
  }

  const setColor = (color: string) => ui.fillStyle = color
  const clear = () => ui.fillRect(0, 0, canvas.width, canvas.height)

  const fillText = (char: string, col: number, row: number) => {
    const { height, width } = cell

    // ui.fillText(char, px.col.x(col), px.row.y(row) + cell.padding, /*maxCharWidth*/)
    ui.save()
    ui.beginPath()
    ui.rect(col * width, y, width, height)
    ui.clip()
    ui.fillText(char, col * width, y)
    ui.restore()
  }

  const fillRect = (col: number, row: number, width = 0, height = 0) => {
    ui.fillRect(px.col.x(col), px.row.y(row), px.col.width(width), px.row.height(height))
  }

  // TODO: move region
  // TODO: underline?
  return { element: canvas, resize, setColor, clear, fillText, fillRect }
}

export default lindt
export type CanvasRenderer = ReturnType<typeof lindt>
