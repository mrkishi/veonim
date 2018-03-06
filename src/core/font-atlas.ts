import * as canvasContainer from '../core/canvas-container'

export interface CharPosition {
  x: number,
  y: number,
}

export interface FontAtlas {
  getCharPosition(char: string, color: string): CharPosition | undefined,
  bitmap: ImageBitmap,
}

// only support the common basic ascii
const charStart = 32
const charEnd = 126
const canvas = document.createElement('canvas')
const ui = canvas.getContext('2d', { alpha: true }) as CanvasRenderingContext2D
document.body.appendChild(canvas)

let atlas: FontAtlas

const generate = async (colors: string[]): Promise<FontAtlas> => {
  if (!colors.length) throw new Error('cannot generate font atlas for no fg colors')
  const colorLines = new Map<string, number>()
  console.log('FAGEN:', colors)

  const drawChar = (col: number, y: number, char: string) => {
    const { height, width } = canvasContainer.cell

    ui.save()
    ui.beginPath()
    ui.rect(col * width, y, width, height)
    ui.clip()
    ui.fillText(char, col * width, y)
    ui.restore()
  }

  // TODO: maybe allow in the future to draw both bg and fg?
  const drawCharLine = (color: string, row: number) => {
    ui.fillStyle = color

    let column = 0
    for (let ix = charStart; ix < charEnd; ix++) {
      drawChar(column, row, String.fromCharCode(ix))
      column++
    }
  }

  const height = canvasContainer.cell.height * colors.length
  const width = (charEnd - charStart) * canvasContainer.cell.width

  canvas.height = height * window.devicePixelRatio
  canvas.width = width * window.devicePixelRatio

  // TODO: only needed for visual testing
  canvas.style.height = `${height}px`
  canvas.style.width = `${width}px`

  ui.imageSmoothingEnabled = false
  ui.font = `${canvasContainer.font.size}px ${canvasContainer.font.face}`
  ui.scale(window.devicePixelRatio, window.devicePixelRatio)
  ui.textBaseline = 'top'

  colors.reduce((currentRow, color) => {
    drawCharLine(color, currentRow)
    colorLines.set(color, currentRow)
    return currentRow + canvasContainer.cell.height
  }, 0)

  const getCharPosition = (char: string, color: string) => {
    const code = char.charCodeAt(0)
    if (code < charStart || code > charEnd) return
    const y = colorLines.get(color)
    if (typeof y !== 'number') return
    const x = (code - charStart) * canvasContainer.cell.width * window.devicePixelRatio
    return { x, y }
  }

  return {
    getCharPosition,
    bitmap: await createImageBitmap(canvas),
  }
}

export default {
  get exists() { return !!atlas },
  get bitmap() { return (atlas || {}).bitmap },
  generate: (colors: string[]) => generate(colors).then(fa => atlas = fa),
  getCharPosition: (char: string, color: string) => {
    if (!atlas) return
    return atlas.getCharPosition(char, color)
  },
}
