import { h, app, Actions, ActionCaller } from '../ui/uikit'
import { Plugin, Row, Badge } from '../styles/common'
import { cmd, feedkeys } from '../core/neovim'
import Input from '../components/text-input'

type TextTransformer = (text: string) => string
type Result = [string, SearchResult[]]

export interface SearchResult {
  line: number,
  col: number,
  text: string,
}

interface State {
  val: string,
  referencedSymbol: string,
  references: Result[],
  cache: Result[],
  vis: boolean,
  ix: number,
  subix: number,
  loading: boolean,
}

let elref: HTMLElement
const SCROLL_AMOUNT = 0.25
const els = new Map<number, HTMLElement>()

const state: State = {
  val: '',
  referencedSymbol: '',
  references: [],
  cache: [],
  vis: false,
  ix: 0,
  subix: -1,
  loading: false,
}

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
  const { line } = items[subix]
  openResult(path, line)
}

const openResult = (path: string, line: number) => {
  cmd(`e ${path}`)
  feedkeys(`${line}G`)
}

const highlightPattern = (text: string, pattern: string, { normal, special }: {
  normal: TextTransformer,
  special: TextTransformer,
}) => {
  const stext = special(pattern)
  return text
    .trimLeft()
    .split(pattern)
    .reduce((grp, part, ix) => {
      if (!part && ix) return (grp.push(stext), grp)
      if (!part) return grp
      ix ? grp.push(stext, normal(part)) : grp.push(normal(part))
      return grp
    }, [] as string[])
}

const view = ($: State, actions: ActionCaller) => Plugin.right('references', $.vis, [

  ,Input({
    ...actions,
    val: $.val,
    focus: true,
    icon: 'filter',
    desc: 'filter references',
  }),

  // TODO: render keys? idk about keys they seem to not work like in react...
  ,h('div', {
    onupdate: (e: HTMLElement) => elref = e,
    style: {
      maxHeight: '100%',
      overflow: 'hidden',
    },
  }, $.references.map(([ path, items ], pos) => h('div', {
    oncreate: (e: HTMLElement) => els.set(pos, e),
  }, [

    ,Row.header({ activeWhen: pos === $.ix }, [
      ,h('span', path),
      ,Badge(items.length, { marginLeft: '12px' })
    ])

    ,pos === $.ix && Row.group({}, items.map((f, itemPos) => Row.normal({
      activeWhen: pos === $.ix && itemPos === $.subix
    }, highlightPattern(f.text, $.referencedSymbol, {

      normal: m => h('span', {
        style: { whiteSpace: 'pre' },
      }, m),

      special: m => h('span.highlight', {
        style: {
          color: '#aaa',
          background: 'rgba(255, 255, 255, 0.1)',
        }
      }, m),

    }))))

  ])))

])

const a: Actions<State> = {}

a.hide = () => ({ vis: false, references: [] })

a.show = (_s, _a, { references, referencedSymbol }) => ({
  references,
  referencedSymbol,
  cache: references,
  vis: true,
  val: '',
  ix: 0,
  subix: -1,
  loading: false,
})

a.select = (s, a) => {
  if (!s.references.length) return a.hide()
  selectResult(s.references, s.ix, s.subix)
  a.hide()
}

a.change = (s, _a, val: string) => ({ val, references: val
  ? s.cache.filter(m => m[0].toLowerCase().includes(val))
  : s.cache
})

a.nextGroup = s => {
  const next = s.ix + 1 > s.references.length - 1 ? 0 : s.ix + 1
  scrollIntoView(next)
  return { subix: -1, ix: next }
}

a.prevGroup = s => {
  const next = s.ix - 1 < 0 ? s.references.length - 1 : s.ix - 1
  scrollIntoView(next)
  return { subix: -1, ix: next }
}

a.next = s => {
  const next = s.subix + 1 < s.references[s.ix][1].length ? s.subix + 1 : 0
  selectResult(s.references, s.ix, next)
  return { subix: next }
}

a.prev = s => {
  const prev = s.subix - 1 < 0 ? s.references[s.ix][1].length - 1 : s.subix - 1
  selectResult(s.references, s.ix, prev)
  return { subix: prev }
}

a.down = () => {
  const { height } = elref.getBoundingClientRect()
  elref.scrollTop += Math.floor(height * SCROLL_AMOUNT)
}

a.up = () => {
  const { height } = elref.getBoundingClientRect()
  elref.scrollTop -= Math.floor(height * SCROLL_AMOUNT)
}

const ui = app({ state, view, actions: a })

export const show = (references: Result[], referencedSymbol?: string) =>
  ui.show({ references, referencedSymbol })
