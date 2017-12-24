import { Watchers, merge, debounce } from '../support/utils'
import { setVar } from '../ui/css'

export interface Font {
  face?: string,
  size?: number,
  lineHeight?: number,
}

const watchers = new Watchers()

const container = document.getElementById('canvas-container') as HTMLElement
const sandboxCanvas = document.createElement('canvas')
const canvas = sandboxCanvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D
container.style.flex = '1'

const _font = {
  face: 'Roboto Mono',
  size: 14,
  lineHeight: 1.5,
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

export const setFont = ({ size = _font.size, face = _font.face, lineHeight = _font.lineHeight }: Font) => {
  setVar('font', face)
  setVar('font-size', size)
  setVar('line-height', lineHeight)
  canvas.font = `${size}px ${face}`
  merge(_font, { size, face, lineHeight })
  merge(_cell, {
    width: Math.floor(canvas.measureText('m').width),
    height: Math.floor(size * lineHeight)
  })

  _cell.padding = Math.floor((_cell.height - _font.size) / 2)

  watchers.notify('font', { ..._font })
  watchers.notify('cell', { ..._cell })
}

const resize = () => {
  const { width, height } = container.getBoundingClientRect()
  merge(_size, {
    height,
    width,
    rows: Math.floor(height / _cell.height),
    cols: Math.floor(width / _cell.width),
  })

  watchers.notify('resize', _size)
}

export const on = (event: string, handler: (data: any) => void) => watchers.add(event, handler)

export const size = {
  get rows() { return _size.rows },
  get cols() { return _size.cols },
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

window.matchMedia('screen and (min-resolution: 2dppx)').addListener(resize)
window.addEventListener('resize', debounce(() => resize(), 150))
