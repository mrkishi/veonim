import { Actions, Events } from '../../utils'
import { action, call } from '../neovim'
import { h, app } from './plugins'
import Worker from '../../worker'
import TermInput from './input'

interface SearchResult { path: string, line: number, col: number, text: string }
interface State { val: string, cwd: string, results: SearchResult[], vis: boolean, ix: number, loading: boolean }

const { on, go } = Worker('search-files')
const state: State = { val: '', cwd: '', results: [], vis: false, ix: 0, loading: false }

const view = ({ val, results, vis, ix }: State, { change, hide, select, next, prev }: any) => h('#grep.plugin', {
  hide: !vis
}, [
  h('.dialog.large', [
    TermInput({ focus: true, val, next, prev, change, hide, select }),

    h('.row', { render: !results.length }, '...'),

    h('div', results.map((f, pos) => h('.row', {
      css: { active: pos === ix },
    }, [
      h('span', f.path),
      h('span', f.line),
      h('span', f.text),
    ]))),
  ])
])

const a: Actions<State> = {}

a.show = (_s, _a, cwd: string) => ({ cwd, vis: true })

a.hide = () => {
  go.stop()
  return { val: '', vis: false, ix: 0, loading: false, results: [] }
}

a.select = (s, a) => {
  if (!s.results.length) return a.hide()
  //TODO: JUST DO IT!!!!!!
  //const { dir, file } = s.results[s.ix]
  //if (file) cmd(`e ${dir}${file}`)
  a.hide()
}

a.change = (s, _a, val: string) => {
  go.query({ query: val, cwd: s.cwd })
  return { val }
}

a.results = (_s, _a, results: SearchResult[]) => ({ results })
a.next = s => ({ ix: s.ix + 1 > 9 ? 0 : s.ix + 1 })
a.prev = s => ({ ix: s.ix - 1 < 0 ? 9 : s.ix - 1 })

const e: Events<State> = {}

e.show = (_s, a, cwd: string) => a.show(cwd)
e.results = (_s, a, results: SearchResult[]) => a.results(results)

const emit = app({ state, view, actions: a, events: e })
on.results((results: SearchResult[]) => {
  console.log('results', results)
  emit('results', results)
})

action('grep', async (query: string) => {
  const cwd = await call.getcwd()
  if (!cwd) return

  emit('show', cwd)
  query && go.query({ query, cwd })
})
