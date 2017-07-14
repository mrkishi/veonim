import { log } from './logger'
import { onRedraw, call, resize, input } from './neovim'
import { body, vimui as ui, makeAttr as mkAttr } from './view'
import { Decurse } from 'decurse'
import { is, merge } from './utils'

type ScrollRegion = [number, number, number, number]

interface Props {
  fg: number,
  bg: number,
  sp: number,
  mode: string,
  clear: number,
  [index: string]: number | string | undefined
}

interface CursorAttr {
  cursor_shape: string,
  hl_id: number
}

interface ModeInfo {
  raw: CursorAttr,
  cursorFG?: number,
  cursorBG?: number,
  cursorShape?: string
}

const g = (() => {
  const colorKeys = ['fg', 'bg', 'sp']
  const n: Props = { fg: 1, bg: 0, sp: 0, mode: 'normal', clear: 0 }
  const color = (fg = n.fg, bg = n.bg) => mkAttr({ fg, bg })

  const updateAll = [
    () => merge({ n, clear: color() }),
    () => merge({ n, cursor: color(n.bg, n.fg) })
  ]

  updateAll.forEach(m => m())

  // TODO: optimize?
  return new Proxy(n, {
    set: (_, name, val) => {
      n[name] = val
      if (colorKeys.includes(name as string)) updateAll.forEach(m => m())
      return true
    }
  })
})()

const defaultScrollRegion = (): ScrollRegion => [0, lines.length - 1, 0, lines[0].length - 1]
const resetLines = (h: number, w: number): Decurse.Line[] => [...Array(h)].map(() => [...Array(w)].map(() => [ g.clear, ' ' ] as Decurse.Char ))

const modes = new Map<number, ModeInfo>()
let lines = resetLines(ui.height, ui.width)
let lastScrollRegion: ScrollRegion | null = null
let x = 0
let y = 0

const api = new Map<string, Function>()
const r = new Proxy(api, {
  set: (_: any, name, fn) => {
    api.set(name as string, fn)
    return true
  }
})

const moveRegionDown = (amt: number, top: number, bottom: number, left: number, right: number) => {
  for (let yix = bottom; yix - amt >= top; yix--) {
    const line = lines[yix]
    const sourceLine = lines[yix - amt]

    for (let xix = left; xix <= right; xix++) {
      if (yix === top) {
        line[xix][0] = g.clear
        line[xix][1] = ' '
      } else {
        if (!sourceLine) continue
        line[xix][0] = sourceLine[xix][0]
        line[xix][1] = sourceLine[xix][1]
        sourceLine[xix][0] = g.clear
        sourceLine[xix][1] = ' '
      }
    }
    line.dirty = true
    sourceLine.dirty = true
  }
}

const moveRegionUp = (amt: number, top: number, bottom: number, left: number, right: number) => {
  for (let yix = top; yix + amt <= bottom; yix++) {
    const line = lines[yix]
    const sourceLine = lines[yix + amt]

    for (let xix = left; xix <= right; xix++) {
      if (yix === bottom) {
        line[xix][0] = g.clear
        line[xix][1] = ' '
      }
      else {
        if (!sourceLine) continue
        line[xix][0] = sourceLine[xix][0]
        line[xix][1] = sourceLine[xix][1]
        sourceLine[xix][0] = g.clear
        sourceLine[xix][1] = ' '
      }
    }
    line.dirty = true
    sourceLine.dirty = true
  }
}

const setCursorAttrs = async (attr: CursorAttr , ix: number) => {
  modes.set(ix, { raw: attr, cursorShape: attr.cursor_shape })
  if (!is.number(attr.hl_id) || attr.hl_id < 1) return

  const fgColor = await call.synIDattr(attr.hl_id, 'fg')
  const bgColor = await call.synIDattr(attr.hl_id, 'bg')

  modes.set(ix, {
    raw: attr,
    cursorFG: fgColor,
    cursorBG: bgColor,
    cursorShape: attr.cursor_shape,
    // TODO: blink?
  })
}

r.update_fg = ([ [ fg ] ]: number[][]) => fg > -1 && merge(g, { fg })
r.update_bg = ([ [ bg ] ]: number[][]) => bg > -1 && merge(g, { bg })
r.update_sp = ([ [ sp ] ]: number[][]) => sp > -1 && merge(g, { sp })

type ModeInfoOpts = [ boolean, CursorAttr[] ][]

r.mode_info_set = ([[ cursorStyleEnabled, modeInfo ]]: ModeInfoOpts) => {
  modes.clear()
  modeInfo.forEach((mode: CursorAttr, ix: number) => setCursorAttrs(mode, ix))
  //modeInfo.forEach(setCursorAttrs)
  // TODO: what do this?
  log `cursorStyleEnabled: ${cursorStyleEnabled + ''}`
}

type ModeChangeOpts = [ string, number ][]

r.mode_change = ([[ mode, modeIx ]]: ModeChangeOpts) => {
  g.mode = mode as string
  log `--${g.mode}--`
  const props = modes.get(modeIx as number) as ModeInfo

  // TODO: sometimes if (ESC) too early cursor does not change color back to NORMAL mode color
  // TODO: assumes artificial only
  // TODO: hard cast and prepare data in mode_info_set
  if (props.cursorFG && props.cursorBG) {
    merge(body.cursor.shape, {
      fg: props.cursorFG-0,
      bg: props.cursorBG-0
    })
    body.render()
  }

  else if (props.cursorFG) {
    merge(body.cursor.shape, {
      bg: props.cursorFG-0,
      fg: 232
    })
    body.render()
  }


  //else if (props.cursorBG) merge(body.cursor.shape, {
  //fg: props.cursorBG
  //})

  //log(`modeIX changed to ${modeIx}`)
  //log(props)
}

// TODO: can we type these any[]?
r.highlight_set = (hiGroup: any[]) => {
  const m = hiGroup.reduce((o, [g]) => merge(o, g), {})

  g.hi = mkAttr({
    fg: m.foreground || g.fg,
    bg: m.background || g.bg,
    bold: m.bold,
    underline: m.underline,
    inverse: m.reverse
  })
}

r.cursor_goto = (m: any[]) => {
  y = m[0][0]
  x = m[0][1]
}

r.put = (m: any[]) => {
  const total = m.length
  for (let ix = 0; ix < total; ix++) {
    // TODO: why does this think it's a string?
    lines[y][x][0] = g.hi as number
    lines[y][x][1] = m[ix][0]
    lines[y].dirty = true
    x++
    if (x > ui.width) {
      x = 0
      y++
    }
  }
}

r.set_scroll_region = (m: any[]) => lastScrollRegion = m[0]

r.scroll = ([ amount ]: number[]) => {
  // docs dont specify what happens when scroll 
  // is called without 'set_scroll_region' first
  // so... assume the full viewport?
  if (lastScrollRegion && !lastScrollRegion.length) lastScrollRegion = defaultScrollRegion()

  // because typescript
  const [ top, bottom, left, right ] = lastScrollRegion as ScrollRegion

  amount > 0 
    ? moveRegionUp(Math.abs(amount), top, bottom, left, right) 
    : moveRegionDown(Math.abs(amount), top, bottom, left, right)

  lastScrollRegion = null
}

r.eol_clear = () => {
  const line = lines[y]
  const total = line.length
  for (let ix = x; ix < total; ix++) {
    line[ix][0] = g.clear
    line[ix][1] = ' '
  }
  line.dirty = true
}

r.clear = () => {
  const totalLines = lines.length
  for (let lineIx = 0; lineIx < totalLines; lineIx++) {
    const line = lines[lineIx]
    const lineLength = line.length

    for (let charIx = 0; charIx < lineLength; charIx++) {
      line[charIx][0] = g.clear
      line[charIx][1] = ' '
    }
    line.dirty = true
  }
}

// TODO: capture focus/blur on app(window global) and show/hide cursor accordingly
// TODO: make this position only?
// or make a nother one for color/shape changes?
const updateCursor = (y: number, x: number) => {
  const { cursor, program } = body
  if (cursor.artificial) {
    program.y = y
    program.x = x
    cursor._hidden = false
    //cursor.color
    //cursor.shape
    return
  }

  //program.resetCursor()
  //program.cursorColor()
  //program.cursorShape()
  program.showCursor()
  program.cup(y, x)
}

ui.on('resize', () => {
  lines = resetLines(ui.height, ui.width)
  resize(ui.width, ui.height)
})

ui.on('keypress', (key: string, { name }: { name: string }) => {
  //getting duplicates of \r - one is 'enter' the other 'return'
  if (name === 'return') return
  else if (key === '<') input('<lt>')
  else if (name === 'backspace') input('\u0008')
  else input(key)
})

const render = (m: any[]) => {
  const count = m.length
  for (let ix = 0; ix < count; ix++) {
    const updates = m[ix]
    const fn = api.get(updates[0])
    fn && fn(updates.slice(1))
  }

  lastScrollRegion = null
  ui.setRawLines(lines)
  updateCursor(y + ui.atop, x + ui.aleft)
  body.render()
}

onRedraw((m: any[]) => render(m))
