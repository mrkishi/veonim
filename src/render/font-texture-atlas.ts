import * as canvasContainer from '../core/canvas-container'

interface CharPosition {
  x: number,
  y: number,
}

interface FontAtlas {
  getCharPosition(char: string, color: string): CharPosition | undefined
  canvas: CanvasRenderingContext2D
}

const CHAR_START = 32
const CHAR_END = 127
const canvas = document.createElement('canvas')
const ui = canvas.getContext('2d', { alpha: true }) as CanvasRenderingContext2D

export const generate = async (): Promise<FontAtlas> => {
  const drawChar = (col: number, y: number, char: string) => {
    const { height, width } = canvasContainer.cell

    ui.save()
    ui.beginPath()
    ui.rect(col * width, y, width, height)
    ui.clip()
    ui.fillText(char, col * width, y)
    ui.restore()
  }


  const height = canvasContainer.cell.height
  const width = (CHAR_END - CHAR_START) * canvasContainer.cell.width

  canvas.height = height * window.devicePixelRatio
  canvas.width = width * window.devicePixelRatio

  ui.imageSmoothingEnabled = false
  ui.font = `${canvasContainer.font.size}px ${canvasContainer.font.face}`
  ui.scale(window.devicePixelRatio, window.devicePixelRatio)
  ui.textBaseline = 'top'

  ui.fillStyle = 'white'

  let column = 0
  for (let ix = CHAR_START; ix < CHAR_END; ix++) {
    drawChar(column, 0, String.fromCharCode(ix))
    column++
  }

  const getCharPosition = (char: string, color: string) => {
    const code = char.charCodeAt(0)
    if (code < CHAR_START || code > CHAR_END) return
    const x = (code - CHAR_START) * canvasContainer.cell.width * window.devicePixelRatio
    const y = 0
    return { x, y }
  }

  return { canvas: ui, getCharPosition }
}
