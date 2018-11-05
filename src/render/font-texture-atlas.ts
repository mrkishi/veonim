import { cell, font } from '../core/canvas-container'

interface UnicodeChar {
  index: number
  width: number
}

const unicodeTable = new Map<string, UnicodeChar>()
const canvas = document.createElement('canvas')
const ui = canvas.getContext('2d', { alpha: true }) as CanvasRenderingContext2D

// 0 - 32 are invisible control chars
let nextIndex = 127 - 32
let needToRegenAtlas = true

const getTableSize = (): number => {
  let totalol = 0
  unicodeTable.forEach(char => totalol += char.width)
  return totalol
}

// TODO: need to determine the max amount of characters we store in the
// texture atlas. at some predetermined point we need to recycle texture
// slots for new characters. this remains to be seen if we use a LILO
// or LRU cache eviction strategy. cache invalidation... fuuuu
export const getCharIndex = (char: string, width = 1) => {
  const uChar = unicodeTable.get(char)
  if (uChar) return uChar.index

  const index = nextIndex++
  unicodeTable.set(char, { index, width })
  needToRegenAtlas = true
  return index
}

export const getUpdatedFontAtlasMaybe = () => {
  if (!needToRegenAtlas) return
  regenAtlas()
  return canvas
}

const regenAtlas = () => {
  needToRegenAtlas = false
  const width = cell.width * (getTableSize() + 127 - 32)
  canvas.height = Math.floor(cell.height * window.devicePixelRatio)
  canvas.width = Math.floor(width * window.devicePixelRatio)

  ui.imageSmoothingEnabled = false
  ui.font = `${font.size}px ${font.face}`
  ui.scale(window.devicePixelRatio, window.devicePixelRatio)
  ui.textBaseline = 'top'
  ui.fillStyle = 'white'

  for (let ix = 32; ix < 127; ix++) drawChar(String.fromCharCode(ix), ix - 32)
  unicodeTable.forEach(({ index, width }, char) => drawChar(char, index, width))
}

const drawChar = (char: string, col: number, width = 1) => {
  // TODO: instead of y being 0, should we account for cell padding?
  const charWidth = cell.width * width
  ui.save()
  ui.beginPath()
  ui.rect(col * cell.width, 0, charWidth, cell.height)
  ui.clip()
  ui.fillText(char, col * cell.width, 0, charWidth)
  ui.restore()
}

export default () => {
  if (needToRegenAtlas) regenAtlas()
  return canvas
}
