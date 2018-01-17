import { Watchers, merge, debounce } from '../support/utils'
import { setVar, contrastFuture } from '../ui/css'
import $, { watch } from '../core/state'
import * as electron from 'electron'

export interface Font {
  face?: string,
  size?: number,
  lineHeight?: number,
}

const watchers = new Watchers()
const container = document.getElementById('canvas-container') as HTMLElement
const sandboxCanvas = document.createElement('canvas')
const canvas = sandboxCanvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D

merge(container.style, {
  display: 'flex',
  flex: '1',
  // TODO: should lighten (or darken) % based on vim current.bg
  background: 'rgb(30, 30, 30)',
})

const _font = {
  face: 'Courier New',
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

process.platform === 'win32' && setFont({ face: 'Consolas' })
process.platform === 'darwin' && setFont({ face: 'Menlo' })
process.platform === 'linux' && setFont({ face: 'DejaVu Sans Mono' })
setImmediate(() => resize())

window.matchMedia('screen and (min-resolution: 2dppx)').addListener(resize)
window.addEventListener('resize', debounce(() => resize(), 150))
electron.screen.on('display-added', () => resize())
electron.screen.on('display-removed', () => resize())
electron.screen.on('display-metrics-changed', () => resize())
