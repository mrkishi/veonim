import { Watchers, merge, debounce } from '../support/utils'
const robotoSizes = require('../assets/roboto-sizes.json')
import * as electron from 'electron'
import { setVar } from '../ui/css'

export interface SetFontParams {
  face?: string,
  size?: number,
  lineHeight?: number,
}

export interface Cell {
  height: number
  width: number
  padding: number
}

export interface Font {
  face: string
  size: number
  lineHeight: number
}

export interface Pad {
  x: number
  y: number
}

const watchers = new Watchers()
const container = document.getElementById('canvas-container') as HTMLElement
const sandboxCanvas = document.createElement('canvas')
const canvas = sandboxCanvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D

merge(container.style, {
  display: 'flex',
  flex: '1',
  background: 'var(--background-30)',
})

const _font = {
  face: 'Roboto Mono Builtin',
  size: 14,
  lineHeight: 1.5,
}

const _pad = {
  x: 4,
  y: 8,
}

const _cell = {
  width: 0,
  height: 0,
  padding: 0,
}

const _size = {
  rows: 0,
  cols: 0,
  height: 0,
  width: 0,
}

const getCharWidth = (font: string, size: number): number => {
  const possibleSize = Math.floor(canvas.measureText('m').width)
  // roboto mono is built-in. because font-loading is a bit slow,
  // we have precomputed most common font sizes in advance
  if (font !== 'Roboto Mono Builtin' && (size > 3 || size < 54)) return possibleSize

  const floatWidth = Reflect.get(robotoSizes, size + '')
  return floatWidth || possibleSize
}

export const setFont = ({ size, lineHeight, face = _font.face }: SetFontParams) => {
  const fontSize = !size || isNaN(size) ? _font.size : size
  const fontLineHeight = !lineHeight || isNaN(lineHeight) ? _font.lineHeight : lineHeight

  setVar('font', face)
  setVar('font-size', fontSize)
  setVar('line-height', fontLineHeight)

  canvas.font = `${fontSize}px ${face}`

  merge(_font, { size: fontSize, face, lineHeight: fontLineHeight })
  merge(_cell, {
    width: getCharWidth(face, fontSize),
    height: Math.floor(fontSize * fontLineHeight)
  })

  _pad.x = Math.round(_cell.width / 2)
  _pad.y = _pad.x + 4

  _cell.padding = Math.floor((_cell.height - _font.size) / 2)

  watchers.notify('font', { ..._font })
  watchers.notify('cell', { ..._cell })
}

export const resize = () => {
  const { width, height } = container.getBoundingClientRect()
  merge(_size, {
    height,
    width,
    rows: Math.floor(height / _cell.height) - 1,
    cols: Math.floor(width / _cell.width) - 2,
  })

  watchers.notify('resize', _size)
}

export const redoResize = (rows: number, cols: number) => {
  merge(_size, { rows, cols })
  watchers.notify('resize', _size)
}

export const on = (event: string, handler: (data: any) => void) => watchers.add(event, handler)

export const pad = {
  get x() { return _pad.x },
  get y() { return _pad.y },
}

export const size = {
  get rows() { return _size.rows },
  get cols() { return _size.cols },
  get height() { return _size.height },
  get width() { return _size.width },
  get nameplateHeight() { return _cell.height + 4 },
}

export const cell = {
  get height() { return _cell.height },
  get width() { return _cell.width },
  get padding() { return _cell.padding },
}

export const font = {
  get face() { return _font.face },
  get size() { return _font.size },
  get lineHeight() { return _font.lineHeight },
}

setFont({})
setImmediate(() => resize())

window.addEventListener('resize', debounce(() => resize(), 150))
window.matchMedia('screen and (min-resolution: 2dppx)').addListener(() => {
  resize()
  watchers.notify('device-pixel-ratio-changed')
})
electron.screen.on('display-added', () => resize())
electron.screen.on('display-removed', () => resize())
electron.screen.on('display-metrics-changed', () => resize())
