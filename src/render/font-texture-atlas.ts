import { cell, font } from '../core/canvas-container'

export const CHAR_START = 32
export const CHAR_END = 127

export default () => {
  const canvas = document.createElement('canvas')
  const ui = canvas.getContext('2d', { alpha: true }) as CanvasRenderingContext2D

  const drawChar = (col: number, y: number, char: string) => {
    const { height, width } = cell

    ui.save()
    ui.beginPath()
    ui.rect(col * width, y, width, height)
    ui.clip()
    ui.fillText(char, col * width, y)
    ui.restore()
  }

  const height = cell.height
  const width = (CHAR_END - CHAR_START) * cell.width

  canvas.height = Math.round(height * window.devicePixelRatio)
  canvas.width = Math.round(width * window.devicePixelRatio)

  ui.imageSmoothingEnabled = false
  ui.font = `${font.size}px ${font.face}`
  ui.scale(window.devicePixelRatio, window.devicePixelRatio)
  ui.textBaseline = 'top'
  ui.fillStyle = 'white'

  let column = 0
  for (let ix = CHAR_START; ix < CHAR_END; ix++) {
    drawChar(column, 0, String.fromCharCode(ix))
    column++
  }

  return canvas
}
