import { cell, font } from '../core/canvas-container'

interface UnicodeChar {
  index: number
  width: number
}

const unicodeTable = new Map<string, UnicodeChar>()
const canvas = document.createElement('canvas')
const ui = canvas.getContext('2d', { alpha: true }) as CanvasRenderingContext2D

// ascii is up to 127, extended ascii up to 255, control chars from 0-32
let nextIndex = 256 - 32
let needToRegenAtlas = false

const getTableSize = (): number => {
  let totalol = 0
  unicodeTable.forEach(char => totalol += char.width)
  return totalol
}

export const getCharIndex = (char: number | string, width = 1) => {
  if (typeof char === 'number') return char - 32

  const uChar = unicodeTable.get(char)
  if (uChar) return uChar.index

  const index = nextIndex++
  unicodeTable.set(char, { index, width })
  needToRegenAtlas = true
  return index
}

export const renderPass = {
  start: () => needToRegenAtlas = false,
  end: () => {
    if (!needToRegenAtlas) return
    regenAtlas()
    return canvas
  },
}

const regenAtlas = () => {
  const width = cell.width * getTableSize() + 255 - 32
  canvas.height = Math.floor(cell.height * window.devicePixelRatio)
  canvas.width = Math.floor(width * window.devicePixelRatio)

  ui.imageSmoothingEnabled = false
  ui.font = `${font.size}px ${font.face}`
  ui.scale(window.devicePixelRatio, window.devicePixelRatio)
  ui.textBaseline = 'top'
  ui.fillStyle = 'white'

  for (let ix = 32; ix < 255; ix++) drawChar(String.fromCharCode(ix), ix - 32)
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

regenAtlas()
export default () => canvas
