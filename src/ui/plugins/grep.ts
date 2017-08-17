import { action, cmd, call, cwdir, feedkeys, expr } from '../neovim'
import { cc, Actions, Events } from '../../utils'
import { h, app } from './plugins'
import Worker from '../../worker'
import TermInput from './input'

interface SearchResult { line: number, col: number, text: string }
type Result = [string, SearchResult[]]
interface State { val: string, cwd: string, results: Result[], vis: boolean, ix: number, subix: number, loading: boolean }

const { on, go } = Worker('search-files')
const state: State = { val: '', cwd: '', results: [], vis: false, ix: 0, subix: -1, loading: false }
const els = new Map<number, HTMLElement>()
let elref: HTMLElement

const view = ({ val, results, vis, ix, subix }: State, { change, hide, select, next, prev, nextGroup, prevGroup, scrollDown, scrollUp }: any) => h('#grep.plugin.right', {
  hide: !vis
}, [
  h('.dialog.top.xlarge', [
    TermInput({ focus: true, val, next, prev, nextGroup, prevGroup, change, hide: () => 0 && hide(), select, down: scrollDown, up: scrollUp }),

    h('.row', { render: !results.length }, '...'),

    // TODO: render keys?
    h('div', {
      onupdate: (e: HTMLElement) => elref = e,
      style: {
        'max-height': '100%',
        'overflow-y': 'hidden',
      },
    }, results.map(([ path, items ], pos) => h('div', [
      h('.row.header', {
        oncreate: (e: HTMLElement) => els.set(pos, e),
        css: { active: pos === ix }
      }, [
        h('span', path),
        h('span.bubble', { style: { 'margin-left': '12px' } }, items.length),
      ]),

      h('.row-group', items.map((f, itemPos) => h('.row.dim', {
        css: { active: pos === ix && itemPos === subix },
      }, f.text))),
    ]))),
  ])
])

const a: Actions<State> = {}

a.show = (_s, _a, { cwd, val }) => ({ cwd, val, vis: true })

a.hide = () => {
  go.stop()
  return { val: '', vis: false, ix: 0, subix: -1, loading: false, results: [] }
}

a.select = (s, a) => {
  if (!s.results.length) return a.hide()
  selectResult(s.results, s.ix, s.subix)
  a.hide()
}

a.change = (s, _a, val: string) => {
  val && go.query({ query: val, cwd: s.cwd })
  return val ? { val } : { val, results: [], ix: 0, subix: 0 }
}

// TODO: perf check
// TODO: render only visible (if waaaaayyyy more out of viewport, buffer)?
a.results = (_s, _a, results: Result[]) => ({ results })

// TODO: scroll if out of bounds
// TODO: lol dirty hack (yeah, if we had el ref, we could get pos in dom much more easy. idk about the overhead tho)
//const ROW_SIZE = 17
a.nextGroup = s => {
  //const topRowInView = Math.floor(elref.scrollTop / 17)
  const next = s.ix + 1 > s.results.length - 1 ? 0 : s.ix + 1
  //const nextRowPos = s.results.slice(0, next).reduce((count, [ , items ]) => count += items.length, 0) + next
  requestAnimationFrame(() => {
    const { bottom: containerBottom } = elref.getBoundingClientRect()
    const e = els.get(next)
    if (!e) return console.log('wut not found', next)
    const { top } = e.getBoundingClientRect()

    if (top + 50 > containerBottom) {
      console.log('this el is out of the visible area!')
      elref.scrollTop += 300
    }
  })
  return { subix: -1, ix: next }
}

a.prevGroup = s => {
  return { subix: -1, ix: s.ix - 1 < 0 ? s.results.length - 1 : s.ix - 1 }
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

a.scrollDown = () => {
  elref.scrollTop += 300
}
a.scrollUp = () => {
  elref.scrollTop -= 300
}

const e: Events<State> = {}

e.show = (_s, a, d) => a.show(d)
e.results = (_s, a, results: Result[]) => a.results(results)

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

const emit = app({ state, view, actions: a, events: e })
// TODO: highlight matched word in result line
on.results((results: Result[]) => emit('results', results))

action('grep', async (query: string) => {
  const cwd = await cwdir()
  emit('show', { cwd })
  query && go.query({ query, cwd })
})

action('grep-word', async () => {
  const [ cwd, query ] = await cc(cwdir(), call.expand('<cword>'))
  emit('show', { cwd, val: query })
  go.query({ query, cwd })
})

action('grep-selection', async () => {
  await feedkeys('gv"zy')
  const selection = await expr('@z')
  const [ query ] = selection.split('\n')
  const cwd = await cwdir()
  emit('show', { cwd, val: query })
  go.query({ query, cwd })
})
