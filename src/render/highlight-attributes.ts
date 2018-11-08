import { asColor } from '../support/utils'
import nvim from '../core/neovim'

export interface Attrs {
  foreground?: number
  background?: number
  special?: number
  reverse?: string
  italic?: string
  bold?: string
  underline?: boolean
  undercurl?: boolean
  cterm_fg?: number
  cterm_bg?: number
}

interface HighlightGroup {
  foreground?: string
  background?: string
  special?: string
  underline: boolean
  reverse: boolean
}

// TODO: info - store the HighlightGroup name somewhere
// this can be used to lookup items in the grid, for example:
// find all positions where a char(s) start with Search hlgrp
const highlightInfo = new Map<number, any>()
const highlights = new Map<number, HighlightGroup>()
const canvas = document.createElement('canvas')
const ui = canvas.getContext('2d', { alpha: true }) as CanvasRenderingContext2D

const defaultColors = {
  background: '#2d2d2d',
  foreground: '#dddddd',
  special: '#ef5188'
}

export const setDefaultColors = (fg: number, bg: number, sp: number) => {
  const foreground = asColor(fg)
  const background = asColor(bg)
  const special = asColor(sp)

  const same = defaultColors.foreground === foreground
    && defaultColors.background === background
    && defaultColors.special === special

  if (same) return false

  nvim.state.foreground = defaultColors.foreground
  nvim.state.background = defaultColors.background
  nvim.state.special = defaultColors.special

  // hlid 0 -> default highlight group
  highlights.set(0, {
    foreground,
    background,
    special,
    underline: false,
    reverse: false,
  })

  Object.assign(defaultColors, { foreground, background, special })

  return true
}

export const addHighlight = (id: number, attr: Attrs, info: any) => {
  const foreground = attr.reverse
    ? asColor(attr.background)
    : asColor(attr.foreground)

  const background = attr.reverse
    ? asColor(attr.foreground)
    : asColor(attr.background)

  highlightInfo.set(id, info)

  highlights.set(id, {
    foreground,
    background,
    special: asColor(attr.special),
    underline: !!(attr.underline || attr.undercurl),
    reverse: !!attr.reverse,
  })
}

export const getHighlight = (id: number) => highlights.get(id)

export const generateColorLookupAtlas = () => {
  canvas.height = 2
  canvas.width = Math.max(...highlights.keys())

  ui.imageSmoothingEnabled = false

  ;[...highlights.entries()].forEach(([ id, hlgrp ]) => {
    // we are not going draw the default background color because we will just
    // let it alpha blend with the background which should be the default
    // background color anyways
    if (hlgrp.background) {
      ui.fillStyle = hlgrp.background
      ui.fillRect(id, 0, 1, 1)
    }

    const defColor = hlgrp.reverse
      ? defaultColors.background
      : defaultColors.foreground

    ui.fillStyle = hlgrp.foreground || defColor
    ui.fillRect(id, 1, 1, 1)
  })

  return canvas
}

export const getColorAtlas = () => canvas
