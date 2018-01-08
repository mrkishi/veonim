import { action, cmd, call, current, feedkeys, expr } from '../core/neovim'
import { h, app, Actions, ActionCaller } from '../ui/uikit'
import { Plugin, Row } from '../styles/common'
import Input from '../components/text-input'
import Worker from '../messaging/worker'

type TextTransformer = (text: string) => string
type Result = [string, SearchResult[]]

interface SearchResult {
  line: number,
  col: number,
  text: string,
}

interface State {
  val: string,
  cwd: string,
  results: Result[],
  vis: boolean,
  ix: number,
  subix: number,
  loading: boolean,
}

let elref: HTMLElement
const SCROLL_AMOUNT = 0.25
const worker = Worker('search-files')
const els = new Map<number, HTMLElement>()

const state: State = {
  val: '',
  cwd: '',
  results: [],
  vis: false,
  ix: 0,
  subix: -1,
  loading: false
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
    ...actions,
    val: $.val,
    focus: true,
    icon: 'search',
    // TODO: 
    small: false,
    desc: 'find in project',
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
      h('span', path),
      h('span.bubble', { style: { 'margin-left': '12px' } }, items.length),
    ])

    ,pos === $.ix && Row.group({}, items.map((f, itemPos) => Row.normal({
      activeWhen: pos === $.ix && itemPos === $.subix
    }, highlightPattern(f.text, $.val, {
      normal: m => h('span', m),
      special: m => h('span.highlight', {
        css: { active: pos === $.ix && itemPos === $.subix },
      }, m),
    }))))

  ])))

])

const a: Actions<State> = {}

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
