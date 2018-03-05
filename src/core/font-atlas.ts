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

// TODO: have neovim renderer collect usage information for various colors being rendered
// and number of chars for each. lots of usages will regenerate the font atlast

// TODO: add support for preparing an atlast for a collection of foreground colors
export const generate = async (
  backgroundColor: string,
  foregroundColors: string[],
): Promise<FontAtlas> => {
  if (!foregroundColors.length) throw new Error('cannot generate font atlas for no fg colors')
  const colorLines = new Map<string, number>()

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
  // TODO: what happens to this canvas? will it get GC? should we reuse canvas
  // for future regen purposes?
  const canvas = document.createElement('canvas')
  // TODO: should this have alpha? the base render layer will already be
  // drawing background, so this may be unnecessary. if there is no performance
  // degradation to using alpha, i think it would be simpler to generate font
  // atlast with transparency
  const ui = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D

  // TODO: yo this is not the actual font height. it's just font size *
  // lineHeight should get actual correct height measurement? does it matter?
  // padding takes up wasted space in the bitmap
  const height = canvasContainer.cell.height * foregroundColors.length
  const width = (charEnd - charStart) * canvasContainer.cell.width

  canvas.height = height * window.devicePixelRatio
  canvas.width = width * window.devicePixelRatio

  // TODO: only needed for visual testing
  // canvas.style.height = `${height}px`
  // canvas.style.width = `${width}px`
  // document.body.appendChild(canvas)

  ui.imageSmoothingEnabled = false
  ui.font = `${canvasContainer.font.size}px ${canvasContainer.font.face}`
  ui.scale(window.devicePixelRatio, window.devicePixelRatio)
  ui.fillStyle = backgroundColor
  ui.fillRect(0, 0, canvas.width, canvas.height)
  ui.textBaseline = 'top'

  foregroundColors.reduce((currentRow, color) => {
    drawCharLine(color, currentRow)
    colorLines.set(color, currentRow)
    return currentRow + canvasContainer.cell.height
  }, 0)

  const getCharPosition = (char: string, color: string) => {
    const code = char.charCodeAt(0)
    if (code < charStart || code > charEnd) return
    const x = code - charStart
    const y = colorLines.get(color)
    if (typeof y !== 'number') return
    return { x, y }
  }

  return {
    getCharPosition,
    bitmap: await createImageBitmap(canvas),
  }
}
