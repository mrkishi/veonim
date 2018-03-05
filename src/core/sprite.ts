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



export const createSprite = async (background: string, foreground: string) => {
  const canvas = document.createElement('canvas')
  canvas.setAttribute('id', 'trolelol')
  const ui = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D

  // TODO: yo this is not the actual font height. it's just font size * lineHeight
  // should get actual correct height measurement?
  const height = canvasContainer.cell.height * 2
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

  const colorLines = new Map<string, number>()
  colorLines.set(foreground, 0)
  colorLines.set('#ff0000', canvasContainer.cell.height)

  drawCharLine(ui, foreground, 0)
  drawCharLine(ui, '#ff0000', canvasContainer.cell.height)

  // TODO: visual testing only
  document.body.appendChild(canvas)

  const getCharPosition = (char: string, color: string) => {
    const code = char.charCodeAt(0)
    if (code < charStart || code > charEnd) return
    const x = code - charStart
    const y = colorLines.get(color)
    if (!y) return
    return { x, y }
  }

  return {
    getCharPosition,
    bitmap: await createImageBitmap(canvas),
  }
}

const main = async () => {
  console.time('createSprite')
  const { bitmap, getCharPosition } = await createSprite('#222222', '#ffffff')
  console.timeEnd('createSprite')
  console.log('bitmap', bitmap)
  const pos = getCharPosition('a', '#ff0000')
  console.log('char pos:', pos)
}

main().catch(console.error)
