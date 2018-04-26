import { action, call, current, feedkeys, expr, jumpTo } from '../core/neovim'
import { RowNormal, RowHeader, RowGroup } from '../components/row-container'
import { PluginRight } from '../components/plugin-container'
import { badgeStyle } from '../styles/common'
import Input from '../components/text-input'
import Worker from '../messaging/worker'
import { h, app } from '../ui/uikit'

type TextTransformer = (text: string, last?: boolean) => string
type Result = [string, SearchResult[]]

enum FocusedElement {
  Search,
  Filter,
}

interface SearchResult {
  line: number,
  col: number,
  text: string,
}

let elref: HTMLElement
const SCROLL_AMOUNT = 0.25
const worker = Worker('search-files')
const els = new Map<number, HTMLElement>()

const state = {
  value: '',
  filterVal: '',
  cwd: '',
  results: [] as Result[],
  visible: false,
  ix: 0,
  subix: -1,
  loading: false,
  focused: FocusedElement.Search,
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

const selectResult = (results: Result[], ix: number, subix: number) => {
  if (subix < 0) return
  const [ path, items ] = results[ix]
  const { line, col: column } = items[subix]
  jumpTo({ path, line, column })
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

const resetState = { visible: false, loading: false }

const actions = {
  focusSearch: () => ({ focused: FocusedElement.Search }),
  focusFilter: () => ({ focused: FocusedElement.Filter }),

  hide: () => resetState,
  show: ({ cwd, value, reset = true }: any) => reset
  ? ({ visible: true, cwd, value, ix: 0, subix: -1, results: [], loading: !!value })
  : ({ visible: true }),

  select: () => (s: S) => {
    if (!s.results.length) return resetState
    selectResult(s.results, s.ix, s.subix)
    return resetState
  },

  change: (value: string) => (s: S) => {
    value && worker.call.query({ query: value, cwd: s.cwd })
    return value ? {
      value,
      loading: true,
    } : {
      value,
      results: [],
      ix: 0,
      subix: 0,
      loading: false,
    }
  },

  changeFilter: (filterVal: string) => {
    worker.call.filter(filterVal)
    return { filterVal }
  },

  results: (results: Result[]) => ({ results }),

  moreResults: (results: Result[]) => (s: S) => {
    const merged = [ ...s.results, ...results ]
    const deduped = merged.filter((m, ix, arr) => arr.findIndex(e => e[0] === m[0]) === ix)
    return { results: deduped }
  },

  nextGroup: () => (s: S) => {
    const next = s.ix + 1 > s.results.length - 1 ? 0 : s.ix + 1
    scrollIntoView(next)
    return { subix: -1, ix: next }
  },

  prevGroup: () => (s: S) => {
    const next = s.ix - 1 < 0 ? s.results.length - 1 : s.ix - 1
    scrollIntoView(next)
    return { subix: -1, ix: next }
  },

  next: () => (s: S) => {
    const next = s.subix + 1 < s.results[s.ix][1].length ? s.subix + 1 : 0
    selectResult(s.results, s.ix, next)
    return { subix: next }
  },

  prev: () => (s: S) => {
    const prev = s.subix - 1 < 0 ? s.results[s.ix][1].length - 1 : s.subix - 1
    selectResult(s.results, s.ix, prev)
    return { subix: prev }
  },

  down: () => {
    const { height } = elref.getBoundingClientRect()
    const maxScroll = elref.scrollHeight - height
    // TODO: should wait until get results back before calling loadNext again...
    if (elref.scrollTop === maxScroll) return worker.call.loadNext()
    elref.scrollTop += Math.floor(height * SCROLL_AMOUNT)
  },

  up: () => {
    const { height } = elref.getBoundingClientRect()
    elref.scrollTop -= Math.floor(height * SCROLL_AMOUNT)
  },

  loadingDone: () => ({ loading: false }),
}

const view = ($: S, a: typeof actions) => PluginRight($.visible, [

  ,Input({
    value: $.value,
    change: a.change,
    hide: a.hide,
    tab: a.focusFilter,
    select: a.select,
    nextGroup: a.nextGroup,
    prevGroup: a.prevGroup,
    next: a.next,
    prev: a.prev,
    down: a.down,
    up: a.up,
    focus: $.focused === FocusedElement.Search,
    icon: 'search',
    desc: 'find in project',
    loading: $.loading,
  }),

  ,Input({
    value: $.filterVal,
    change: a.changeFilter,
    hide: a.hide,
    tab: a.focusSearch,
    select: a.select,
    nextGroup: a.nextGroup,
    prevGroup: a.prevGroup,
    next: a.next,
    prev: a.prev,
    down: a.down,
    up: a.up,
    focus: $.focused === FocusedElement.Filter,
    icon: 'filter',
    small: true,
    desc: 'filter files',
  }),

  // TODO: render keys? idk about keys they seem to not work like in react...
  ,h('div', {
    ref: (e: HTMLElement) => {
      if (e) elref = e
    },
    style: {
      maxHeight: '100%',
      overflowY: 'hidden',
    },
  }, $.results.map(([ path, items ], pos) => h('div', {
    ref: (e: HTMLElement) => {
      if (e) els.set(pos, e)
    },
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
      key: `${f.line}-${f.col}-${f.text}`,
      active: pos === $.ix && itemPos === $.subix,
    }, [
      ,h('span', highlightPattern(f.text, $.value, {

        normal: (text, last) => h('span', {
          style: {
            whiteSpace: 'pre',
            textOverflow: last ? 'ellipsis' : undefined,
            overflow: last ? 'inherit' : undefined,
          },
        }, text),

        special: text => h('span.highlight', {
          style: {
            color: '#aaa',
            background: 'rgba(255, 255, 255, 0.1)',
          }
        }, text)

      }))
    ])))

  ])))

])

const ui = app({ name: 'grep', state, actions, view })

worker.on.results((results: Result[]) => ui.results(results))
worker.on.moreResults((results: Result[]) => ui.moreResults(results))
worker.on.done(ui.loadingDone)

action('grep-resume', () => ui.show({ reset: false }))

action('grep', async (query: string) => {
  const { cwd } = current
  ui.show({ cwd })
  query && worker.call.query({ query, cwd })
})

action('grep-word', async () => {
  const { cwd } = current
  const query = await call.expand('<cword>')
  ui.show({ cwd, value: query })
  worker.call.query({ query, cwd })
})

action('grep-selection', async () => {
  await feedkeys('gv"zy')
  const selection = await expr('@z')
  const [ query ] = selection.split('\n')
  const { cwd } = current
  ui.show({ cwd, value: query })
  worker.call.query({ query, cwd })
})
