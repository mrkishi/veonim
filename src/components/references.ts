import { RowNormal, RowHeader, RowGroup } from '../components/row-container'
import { PluginRight } from '../components/plugin-container'
import Input from '../components/text-input'
import { badgeStyle } from '../styles/common'
import * as Icon from 'hyperapp-feather'
import { jumpTo } from '../core/neovim'
import { h, app } from '../ui/uikit'

type TextTransformer = (text: string, last?: boolean) => string
type Result = [string, SearchResult[]]

export interface SearchResult {
  line: number,
  column: number,
  text: string,
}

let elref: HTMLElement
const SCROLL_AMOUNT = 0.25
const els = new Map<number, HTMLElement>()

const state = {
  val: '',
  referencedSymbol: '',
  references: [] as Result[],
  cache: [] as Result[],
  vis: false,
  ix: 0,
  subix: -1,
  loading: false,
}

type S = typeof state

// scroll after next section has been rendered as expanded (a little hacky)
const scrollIntoView = (next: number) => setTimeout(() => {
  const { top: containerTop, bottom: containerBottom } = elref.getBoundingClientRect()
  const e = els.get(next)
  if (!e) return

  const { top, height } = e.getBoundingClientRect()

  if (top + height > containerBottom) {
    const offset = top - containerBottom

    if (offset < containerTop) elref.scrollTop += top - containerTop
    else elref.scrollTop += offset + height + containerTop + 50
  }

  else if (top < containerTop) elref.scrollTop += top - containerTop
}, 1)

const selectResult = (references: Result[], ix: number, subix: number) => {
  if (subix < 0) return
  const [ path, items ] = references[ix]
  const { line, column } = items[subix]
  jumpTo({ line, column, path })
}

const highlightPattern = (text: string, pattern: string, { normal, special }: {
  normal: TextTransformer,
  special: TextTransformer,
}) => {
  const stext = special(pattern)
  return text
    .trimLeft()
    .split(pattern)
    .reduce((grp, part, ix, arr) => {
      if (!part && ix) return (grp.push(stext), grp)
      if (!part) return grp
      const last = ix === arr.length - 1
      ix ? grp.push(stext, normal(part, last)) : grp.push(normal(part, last))
      return grp
    }, [] as string[])
}

const resetState = { vis: false, references: [] } 

const actions =  {
  hide: () => resetState,

  show: ({ references, referencedSymbol }: any) => ({
    references,
    referencedSymbol,
    cache: references,
    vis: true,
    val: '',
    ix: 0,
    subix: -1,
    loading: false,
  }),

  select: () => (s: S) => {
    if (!s.references.length) return resetState
    selectResult(s.references, s.ix, s.subix)
    return resetState
  },

  change: (val: string) => (s: S) => ({ val, references: val
    ? s.cache.filter(m => m[0].toLowerCase().includes(val))
    : s.cache
  }),

  nextGroup: () => (s: S) => {
    const next = s.ix + 1 > s.references.length - 1 ? 0 : s.ix + 1
    scrollIntoView(next)
    return { subix: -1, ix: next }
  },

  prevGroup: () => (s: S) => {
    const next = s.ix - 1 < 0 ? s.references.length - 1 : s.ix - 1
    scrollIntoView(next)
    return { subix: -1, ix: next }
  },

  next: () => (s: S) => {
    const next = s.subix + 1 < s.references[s.ix][1].length ? s.subix + 1 : 0
    selectResult(s.references, s.ix, next)
    return { subix: next }
  },

  prev: () => (s: S) => {
    const prev = s.subix - 1 < 0 ? s.references[s.ix][1].length - 1 : s.subix - 1
    selectResult(s.references, s.ix, prev)
    return { subix: prev }
  },

  down: () => {
    const { height } = elref.getBoundingClientRect()
    elref.scrollTop += Math.floor(height * SCROLL_AMOUNT)
  },

  up: () => {
    const { height } = elref.getBoundingClientRect()
    elref.scrollTop -= Math.floor(height * SCROLL_AMOUNT)
  },
}

const view = ($: S, a: typeof actions) => PluginRight($.vis, [

  ,Input({
    up: a.up,
    hide: a.hide,
    next: a.next,
    prev: a.prev,
    down: a.down,
    select: a.select,
    change: a.change,
    nextGroup: a.nextGroup,
    prevGroup: a.prevGroup,
    value: $.val,
    focus: true,
    icon: Icon.Filter,
    desc: 'filter references',
  }),

  ,h('div', {
    oncreate: (e: HTMLElement) => elref = e,
    style: {
      maxHeight: '100%',
      overflow: 'hidden',
    },
  }, $.references.map(([ path, items ], pos) => h('div', {
    key: path,
    oncreate: (e: HTMLElement) => els.set(pos, e),
  }, [

    ,h(RowHeader, {
      active: pos === $.ix,
    }, [
      ,h('span', path),
      ,h('div', {
        style: {
          ...badgeStyle,
          marginLeft: '12px',
        },
      }, [
        ,h('span', items.length)
      ])
    ])

    ,pos === $.ix && h(RowGroup, {}, items.map((f, itemPos) => h(RowNormal, {
      key: `${f.line}-${f.column}-${f.text}`,
      active: pos === $.ix && itemPos === $.subix
    }, highlightPattern(f.text, $.referencedSymbol, {

      normal: (text, last) => h('div', {
        style: {
          whiteSpace: 'pre',
          textOverflow: last ? 'ellipsis' : undefined,
          overflow: last ? 'inherit' : undefined,
        },
      }, text),

      special: text => h('.highlight', {
        style: {
          color: '#aaa',
          background: 'rgba(255, 255, 255, 0.1)',
        }
      }, text),

    }))))

  ])))

])

const ui = app({ name: 'references', state, actions, view })

export const show = (references: Result[], referencedSymbol?: string) =>
  ui.show({ references, referencedSymbol })
