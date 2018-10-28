import { asColor } from '../support/utils'

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
}

// TODO: info - store the HighlightGroup name somewhere
// this can be used to lookup items in the grid, for example:
// find all positions where a char(s) start with Search hlgrp
const highlightInfo = new Map<number, any>()
const highlights = new Map<number, HighlightGroup>()

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
  })
}

export const generateColorLookupAtlas = () => {
  console.log('pls gen lookup color atlas')
}
