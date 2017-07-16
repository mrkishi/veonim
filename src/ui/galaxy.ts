// TODO: put somewhere else
const logger = (str: TemplateStringsArray | string, v: any[]) => typeof str === 'string'
  ? console.log(str as string)
  : console.log((str as TemplateStringsArray).map((s, ix) => s + (v[ix] || '')).join(''))

export const log = (str: TemplateStringsArray | string, ...vars: any[]) => logger(str, vars)
export const onProp = <T>(cb: Function): T => new Proxy({}, { get: (_, name) => cb(name) }) as T

import { attach, onRedraw, onExit, input } from '../neovim'
import { remote } from 'electron'
import CanvasGrid from './canvas-grid'
const merge = Object.assign

interface ScrollRegion {
  top: number,
  bottom: number,
  left: number,
  right: number
}

interface Colors {
  fg: string,
  bg: string,
  sp: string
}

const ui = new CanvasGrid('nvim')
const { innerHeight: winHeight, innerWidth: winWidth } = window
const cursorEl = document.getElementById('cursor') as HTMLElement

// TODO: move cursor to canvasgrid
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

const defaultScrollRegion = (): ScrollRegion => ({
  top: 0,
  left: 0,
  right: ui.cols,
  bottom: ui.rows
})

const clearBlock = (col: number, row: number, width: number, height: number) =>
  fillBlock(col, row, width, height, colors.bg)

const fillBlock = (col: number, row: number, width: number, height: number, color: string) => {
  ui.setFillStyle(color).fillRect(col, row, width, height)
}

//const slideVertical = (top: number, height: number, origin: number, left: number, right: number) => {
  //const { height: fh, width: fw } = font
  //const slice = ui.getImageData(left * fw, top * fh, (right - left + 1) * fw, height * fh)
  //ui.putImageData(slice, left * fw, origin * fh)
//}

//const moveRegionUp = (amount: number, { top, bottom, left, right }: ScrollRegion) => {
  //slideVertical(top + amount, bottom - (top + amount) + 1, top, left, right)
  ////fillBlock(bottom - amount + 1, left, amount, right - left + 1, colors.bg)
  //fillBlock(left, bottom - amount + 1, right - left + 1, amount, colors.bg)
//}

//const moveRegionDown = (amount: number, { top, bottom, left, right }: ScrollRegion) => {
  //slideVertical(top, bottom - (top + amount) + 1, top + amount, left, right)
  ////fillBlock(top, left, amount, right - left + 1, colors.bg)
  //fillBlock(left, top, right - left + 1, amount, colors.bg)
//}

r.cursor_goto = (row: number, col: number) => merge(cursor, { col, row })
r.update_fg = (fg: number) => fg > -1 && merge(colors, { fg })
r.update_bg = (bg: number) => bg > -1 && merge(colors, { bg })
r.update_sp = (sp: number) => sp > -1 && merge(colors, { sp })
r.set_scroll_region = (top: number, bottom: number, left: number, right: number) => lastScrollRegion = { top, bottom, left, right }
r.eol_clear = () => clearBlock(cursor.col, cursor.row, ui.cols - cursor.col + 1, 1)
r.clear = () => ui.setFillStyle(colors.bg).clear()

r.put = (m: any[]) => {
  const total = m.length
  if (!total) return
  clearBlock(cursor.col, cursor.row, total, 1)

  // TODO: best baseline?
  ui.setFillStyle(colors.fg).setTextBaseLine('bottom')

  for (let ix = 0; ix < total; ix++) {
    ui.fillText(m[ix][0], cursor.col, cursor.row)
    cursor.col++
    if (cursor.col > ui.cols) {
      cursor.col = 0
      cursor.row++
    }
  }
}

r.scroll = (amount: number) => {
  const { top: stop, bottom: sbottom, left: sleft, right: sright } = lastScrollRegion || defaultScrollRegion()

  let dstTop = stop
  let dstBottom = sbottom
  let srcTop = stop
  let srcBottom = sbottom

  if (amount > 0) {
    srcTop += amount
    dstBottom -= amount
    var clr_top = dstBottom + 1
    var clr_bottom = srcBottom
  } else {
    srcBottom += amount
    dstTop -= amount
    var clr_top = srcTop
    var clr_bottom = dstTop - 1
  }

  const slice = ui.getImageData(sleft, srcTop, (sright - sleft) + 1, (srcBottom - srcTop) + 1)

  ui
    .putImageData(slice, sleft, dstTop)
    .setFillStyle(colors.bg)
    .fillRect(sleft, clr_top, (sright - sleft) + 1, (clr_bottom - clr_top) + 1)
}

//r.scroll = (amount: number) => {
   //docs dont specify what happens when scroll
   //is called without 'set_scroll_region' first
   //so... assume the full viewport?
  //amount > 0
    //? moveRegionUp(amount, lastScrollRegion || defaultScrollRegion())
    //: moveRegionDown(amount, lastScrollRegion || defaultScrollRegion())

  //lastScrollRegion = null
//}

ui.setFont({ size: 12, face: 'Roboto Mono', lineHeight: 1.5 }).resize(winHeight, winWidth)
const cursor = { row: 0, col: 0 }

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

attach(ui.cols, ui.rows)

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
