import * as canvasContainer from '../core/canvas-container'

const charStart = 32
const charEnd = 126

const drawChar = (ui: CanvasRenderingContext2D, col: number, y: number, char: string) => {
  const { height, width } = canvasContainer.cell

  ui.save()
  ui.beginPath()
  ui.rect(col * width, y, width, height)
  ui.clip()
  ui.fillText(char, col * width, y)
  ui.restore()
}

// TODO: maybe allow in the future to draw both bg and fg?
const drawCharLine = (ui: CanvasRenderingContext2D, color: string, row: number) => {
  ui.fillStyle = color

  let column = 0
  for (let ix = charStart; ix < charEnd; ix++) {
    drawChar(ui, column, row, String.fromCharCode(ix))
    column++
  }
}

export const createSprite = (background: string, foreground: string) => {
  const canvas = document.createElement('canvas')
  canvas.setAttribute('id', 'trolelol')
  const ui = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D

  const height = canvasContainer.cell.height
  const width = 94 * canvasContainer.cell.width

  canvas.height = height * window.devicePixelRatio
  canvas.width = width * window.devicePixelRatio

  // TODO: only needed for visual testing
  canvas.style.height = `${height}px`
  canvas.style.width = `${width}px`

  ui.imageSmoothingEnabled = false
  ui.font = `${canvasContainer.font.size}px ${canvasContainer.font.face}`
  ui.scale(window.devicePixelRatio, window.devicePixelRatio)
  ui.fillStyle = background
  ui.fillRect(0, 0, canvas.width, canvas.height)
  ui.textBaseline = 'top'

  drawCharLine(ui, foreground, 0)

  // TODO: testing only
  document.body.appendChild(canvas)
}

createSprite('#222222', '#ffffff')
