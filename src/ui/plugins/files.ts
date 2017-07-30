import { load, cancel, onResults, query, getInitial, whenDone } from './deep-fuzzy-files'
import { delay, Actions, Events } from '../../utils'
import { call, notify } from '../neovim-client'
import { basename, dirname } from 'path'
import { h, app } from './plugins'
import TermInput from './input'
const { cmd } = notify

interface FileDir { dir: string, file: string }
interface State { val: string, files: FileDir[], cache: FileDir[], vis: boolean, ix: number, currentFile: string, loading: boolean }

const formatDir = (dir: string) => dir === '.' ? '' : `${dir}/`
const asDirFile = (files: string[], currentFile: string) => files
  .filter(m => m !== currentFile)
  .map(path => ({
    dir: formatDir(dirname(path)),
    file: basename(path),
  }))

const state: State = { val: '', files: [], cache: [], vis: false, ix: 0, currentFile: '', loading: false }

const view = ({ val, files, vis, ix, loading }: State, { change, hide, select, next, prev }: any) => h('#files.plugin', {
  hide: !vis
}, [
  h('.dialog.large', [
    TermInput({ focus: true, val, next, prev, change, hide, select, loading }),

    h('div', files.map((f, key) => h('.row', {
      key,
      css: { active: key === ix },
    }, [
      h('span', { style: { color: '#666' } }, f.dir),
      h('span', f.file)
    ]))),
  ])
])

const a: Actions<State> = {}

a.show = (s, a, currentFile: string) => {
  a.loading()
  return { vis: true, currentFile, files: s.cache }
}

a.hide = () => {
  cancel()
  return { val: '', vis: false, ix: 0, loading: false }
}

a.select = (s, a) => {
  if (!s.files.length) return a.hide()
  const { dir, file } = s.files[s.ix]
  if (file) cmd(`e ${dir}${file}`)
  a.hide()
}

a.change = (_s, _a, val: string) => {
  query(val)
  return { val }
}

// TODO: why not work?
a.loading = async () => {
  await delay(200)
  return { loading: true }
}

a.done = () => ({ loading: false })
a.initial = (s, _a, files: string[]) => ({ cache: asDirFile(files, s.currentFile) })
a.results = (s, _a, files: string[]) => ({ files: asDirFile(files, s.currentFile) })
a.next = s => ({ ix: s.ix + 1 > 9 ? 0 : s.ix + 1 })
a.prev = s => ({ ix: s.ix - 1 < 0 ? 9 : s.ix - 1 })

const e: Events<State> = {}

e.show = (_s, a, currentFile: string) => a.show(currentFile)
e.initial = (_s, a, files: string[]) => a.initial(files)
e.results = (_s, a, files: string[]) => a.results(files)
e.done = (_s, a) => a.done()

const emit = app({ state, view, actions: a, events: e })

export default async () => {
  const cwd = await call.getcwd()
  if (!cwd) return

  load(cwd)
  onResults(files => emit('results', files))
  whenDone(() => emit('done'))
  const currentFile = await call.expand('%f')
  emit('show', currentFile)

  const first = await getInitial()
  emit('initial', first)
}
