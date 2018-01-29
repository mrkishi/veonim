import { action, cmd, call, current, feedkeys, expr } from '../core/neovim'
import { h, app, Actions, ActionCaller } from '../ui/uikit'
import { Plugin, Row, Badge } from '../styles/common'
import Input from '../components/text-input'
import Worker from '../messaging/worker'

type TextTransformer = (text: string) => string
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

interface State {
  val: string,
  filterVal: string,
  cwd: string,
  results: Result[],
  vis: boolean,
  ix: number,
  subix: number,
  loading: boolean,
  focused: FocusedElement,
}

let elref: HTMLElement
const SCROLL_AMOUNT = 0.25
const worker = Worker('search-files')
const els = new Map<number, HTMLElement>()

const state: State = {
  val: '',
  filterVal: '',
  cwd: '',
  results: [],
  vis: false,
  ix: 0,
  subix: -1,
  loading: false,
  focused: FocusedElement.Search,
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

const selectResult = (results: Result[], ix: number, subix: number) => {
  if (subix < 0) return
  const [ path, items ] = results[ix]
  const { line } = items[subix]
  openResult(path, line)
}

const openResult = (path: string, line: number) => {
  cmd(`e ${path}`)
  feedkeys(`${line}Gzz`)
}

const highlightPattern = (text: string, pattern: string, { normal, special }: { normal: TextTransformer, special: TextTransformer }) => {
  const stext = special(pattern)
  return text
    .split(pattern)
    .reduce((grp, part, ix) => {
      if (!part && ix) return (grp.push(stext), grp)
      if (!part) return grp
      ix ? grp.push(stext, normal(part)) : grp.push(normal(part))
      return grp
    }, [] as string[])
}

const view = ($: State, actions: ActionCaller) => Plugin.right('grep', $.vis, [

  ,Input({
    val: $.val,
    change: actions.change,
    hide: actions.hide,
    tab: actions.focusFilter,
    select: actions.select,
    nextGroup: actions.nextGroup,
    prevGroup: actions.prevGroup,
    next: actions.next,
    prev: actions.prev,
    down: actions.down,
    up: actions.up,
    focus: $.focused === FocusedElement.Search,
    icon: 'search',
    desc: 'find in project',
  }),

  ,Input({
    val: $.filterVal,
    change: actions.changeFilter,
    hide: actions.hide,
    tab: actions.focusSearch,
    select: actions.select,
    nextGroup: actions.nextGroup,
    prevGroup: actions.prevGroup,
    next: actions.next,
    prev: actions.prev,
    down: actions.down,
    up: actions.up,
    focus: $.focused === FocusedElement.Filter,
    icon: 'filter',
    small: true,
    desc: 'filter files',
  }),

  // TODO: render keys? idk about keys they seem to not work like in react...
  ,h('div', {
    onupdate: (e: HTMLElement) => elref = e,
    style: {
      maxHeight: '100%',
      overflowY: 'hidden',
    },
  }, $.results.map(([ path, items ], pos) => h('div', {
    oncreate: (e: HTMLElement) => els.set(pos, e),
  }, [

    ,Row.header({ activeWhen: pos === $.ix }, [
      ,h('span', path),
      ,Badge(items.length, { marginLeft: '12px' })
    ])

    ,pos === $.ix && Row.group({}, items.map((f, itemPos) => Row.normal({
      activeWhen: pos === $.ix && itemPos === $.subix
    }, highlightPattern(f.text, $.val, {
      normal: m => h('span', m),
      special: m => h('span.highlight', {
        style: pos === $.ix && itemPos === $.subix && {
          color: '#aaa',
          background: 'rgba(255, 255, 255, 0.1)',
        }
      }, m),
    }))))

  ])))

])

const a: Actions<State> = {}

a.focusSearch = () => ({ focused: FocusedElement.Search })
a.focusFilter = () => ({ focused: FocusedElement.Filter })

a.hide = () => ({ vis: false })
a.show = (_s, _a, { cwd, val, reset = true }) => reset
  ? ({ vis: true, cwd, val, ix: 0, subix: -1, results: [], loading: false })
  : ({ vis: true })

a.select = (s, a) => {
  if (!s.results.length) return a.hide()
  selectResult(s.results, s.ix, s.subix)
  a.hide()
}

a.change = (s, _a, val: string) => {
  val && worker.call.query({ query: val, cwd: s.cwd })
  return val ? { val } : { val, results: [], ix: 0, subix: 0 }
}

a.changeFilter = (_s, _a, filterVal: string) => {
  worker.call.filter(filterVal)
  return { filterVal }
}

a.results = (_s, _a, results: Result[]) => ({ results })

a.moreResults = (s, _a, results: Result[]) => {
  const merged = [ ...s.results, ...results ]
  const deduped = merged.filter((m, ix, arr) => arr.findIndex(e => e[0] === m[0]) === ix)
  return { results: deduped }
}

a.nextGroup = s => {
  const next = s.ix + 1 > s.results.length - 1 ? 0 : s.ix + 1
  scrollIntoView(next)
  return { subix: -1, ix: next }
}

a.prevGroup = s => {
  const next = s.ix - 1 < 0 ? s.results.length - 1 : s.ix - 1
  scrollIntoView(next)
  return { subix: -1, ix: next }
}

a.next = s => {
  const next = s.subix + 1 < s.results[s.ix][1].length ? s.subix + 1 : 0
  selectResult(s.results, s.ix, next)
  return { subix: next }
}

a.prev = s => {
  const prev = s.subix - 1 < 0 ? s.results[s.ix][1].length - 1 : s.subix - 1
  selectResult(s.results, s.ix, prev)
  return { subix: prev }
}

a.down = () => {
  const { height } = elref.getBoundingClientRect()
  const maxScroll = elref.scrollHeight - height
  // TODO: should wait until get results back before calling loadNext again...
  if (elref.scrollTop === maxScroll) return worker.call.loadNext()
  elref.scrollTop += Math.floor(height * SCROLL_AMOUNT)
}

a.up = () => {
  const { height } = elref.getBoundingClientRect()
  elref.scrollTop -= Math.floor(height * SCROLL_AMOUNT)
}

const ui = app({ state, view, actions: a })
worker.on.results((results: Result[]) => ui.results(results))
worker.on.moreResults((results: Result[]) => ui.moreResults(results))

action('grep-resume', () => ui.show({ reset: false }))

action('grep', async (query: string) => {
  const { cwd } = current
  ui.show({ cwd })
  query && worker.call.query({ query, cwd })
})

action('grep-word', async () => {
  const { cwd } = current
  const query = await call.expand('<cword>')
  ui.show({ cwd, val: query })
  worker.call.query({ query, cwd })
})

action('grep-selection', async () => {
  await feedkeys('gv"zy')
  const selection = await expr('@z')
  const [ query ] = selection.split('\n')
  const { cwd } = current
  ui.show({ cwd, val: query })
  worker.call.query({ query, cwd })
})
