// TODO: put somewhere else
const logger = (str: TemplateStringsArray | string, v: any[]) => typeof str === 'string'
  ? console.log(str as string)
  : console.log((str as TemplateStringsArray).map((s, ix) => s + (v[ix] || '')).join(''))

export const log = (str: TemplateStringsArray | string, ...vars: any[]) => logger(str, vars)
export const onProp = <T>(cb: Function): T => new Proxy({}, { get: (_, name) => cb(name) }) as T

import { attach, onRedraw, onExit, input } from '../neovim'
import { remote } from 'electron'
const merge = Object.assign

type ScrollRegion = [number, number, number, number]

interface Colors {
  fg: string,
  bg: string,
  sp: string
}

interface Font {
  height: number,
  width: number,
  lineHeight: number,
  face: string
}

interface GridPos {
  col: number,
  row: number,
  x: number,
  y: number
}


const { devicePixelRatio: pxRatio, innerHeight: winHeight, innerWidth: winWidth } = window
const canvas = document.getElementById('nvim') as HTMLCanvasElement
const cursorEl = document.getElementById('cursor') as HTMLCanvasElement
const ui = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D

const resizeCanvas = (cvs: HTMLCanvasElement, ctx: CanvasRenderingContext2D, height: number, width: number) => {
  cvs.height = height * 2
  cvs.width = width * 2
  cvs.style.height = `${height}px`
  cvs.style.width = `${width}px`
  ctx.scale(pxRatio, pxRatio)
}

const sizeToGrid = (height: number, width: number) => ({
  row: Math.floor(height / font.height),
  col: Math.floor(width / font.width)
})

const extGridToPixels = (obj: { col: number, row: number }) => new Proxy(obj, { get: (t, key) => {
  if (key === 'x') return t.col * font.width
  if (key === 'y') return t.row * font.height + font.height
  else return Reflect.get(t, key)
}}) as GridPos

const setFontSize = (px: number) => {
  ui.font = `${px}px ${font.face}`
  const { width } = ui.measureText('m')
  const height = Math.ceil(px * font.lineHeight)
  merge(font, { width, height })
  merge(cursorEl.style, { width: `${width}px`, height: `${height}px` })
  // TODO do we need to resize canvas?
}

const updateCursor = ({ x, y }: GridPos) => merge(cursorEl.style, { top: `${y - font.height}px`, left: `${x}px` })

const api = new Map<string, Function>()
const r = new Proxy(api, {
  set: (_: any, name, fn) => {
    api.set(name as string, fn)
    return true
  }
})

let lastScrollRegion: ScrollRegion | null = null
const colors: Colors = {
  fg: '#ccc',
  bg: '#222',
  sp: '#f00'
}

const font: Font = {
  height: 0,
  width: 0,
  lineHeight: 1.5,
  face: 'Roboto Mono'
}

const clearBlock = (col: number, row: number, width: number, height: number) =>
  fillBlock(col, row, width, height, colors.bg)

const fillBlock = (col: number, row: number, width: number, height: number, color: string) => {
  const { width: fw, height: fh } = font
  ui.fillStyle = color
  ui.fillRect(col * fw, row * fh, width * fw, height * fh)
}

r.cursor_goto = (row: number, col: number) => merge(cursor, { col, row })
r.update_fg = (fg: number) => fg > -1 && merge(colors, { fg })
r.update_bg = (bg: number) => bg > -1 && merge(colors, { bg })
r.update_sp = (sp: number) => sp > -1 && merge(colors, { sp })
r.set_scroll_region = (m: any[]) => lastScrollRegion = m[0]
r.eol_clear = () => clearBlock(cursor.col, cursor.row, grid.col - cursor.col + 1, 1)
r.clear = () => {
  ui.fillStyle = colors.bg
  ui.fillRect(0, 0, winWidth, winHeight)
}

r.put = (m: any[]) => {
  const total = m.length
  if (!total) return
  clearBlock(cursor.col, cursor.row, total, 1)

  ui.fillStyle = colors.fg
  ui.textBaseline = 'bottom'

  for (let ix = 0; ix < total; ix++) {
    ui.fillText(m[ix][0], cursor.x, cursor.y)
    cursor.col++
    if (cursor.col > grid.col) {
      cursor.col = 0
      cursor.row++
    }
  }
}

resizeCanvas(canvas, ui, winHeight, winWidth)
setFontSize(12)
const cursor = extGridToPixels({ row: 0, col: 0 })
const grid = extGridToPixels(sizeToGrid(winHeight, winWidth))

onRedraw((m: any[]) => {
  const count = m.length
  for (let ix = 0; ix < count; ix++) {
    const [ method, ...args ] = m[ix]
    const fn = api.get(method)
    if (fn) method === 'put' 
      ? fn(args)
      : args.forEach((a: any[]) => fn(...a))
  }

  lastScrollRegion = null
  updateCursor(cursor)
})

onExit(() => {
  console.log('goodbye see ya later')
  remote.app.quit()
})

attach(grid.col, grid.row)

const getMetaKey = (ctrl: boolean, shift: boolean, meta: boolean, alt: boolean): string => {
  if (ctrl) return 'C'
  if (shift) return 'S'
  if (meta) return 'D'
  if (alt) return 'A'
  else return ''
}

const toVimKey = (key: string): string => {
  if (key === 'Backspace') return 'BS'
  if (key === '<') return 'LT'
  if (key === 'Escape') return 'Esc'
  if (key === 'Delete') return 'Del'
  if (key === ' ') return 'Space'
  else return key
}

const wrapKey = (key: string): string => key.length > 1 ? `<${key}>` : key

const remaps = new Map<string, string>()
remaps.set('C', 'D')
remaps.set('D', 'C')

const userRemaps = (key: string): string => remaps.get(key) || key

document.addEventListener('keydown', (e) => {
  const { key, ctrlKey: ctrl, shiftKey: shift, metaKey: meta, altKey: alt } = e
  const inputSequence = ctrl || shift || meta || alt
    ? `<${userRemaps(getMetaKey(ctrl, shift, meta, alt))}-${key}>`
    : wrapKey(toVimKey(key))

  console.log(`input: ${inputSequence}`)
  e.preventDefault()
  input(inputSequence)
})
