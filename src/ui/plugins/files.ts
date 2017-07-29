import { load, cancel, onResults, query, getInitial, whenDone } from './deep-fuzzy-files'
import { call, notify } from '../neovim-client'
import { h, ui, delay } from '../../utils'
import { basename, dirname } from 'path'
import * as viminput from '../input'
import TermInput from './input'
import vim from '../canvasgrid'
const { cmd } = notify

const formatDir = (dir: string) => dir === '.' ? '' : `${dir}/`

const asDirFile = (files: string[], currentFile: string) => files
  .filter(m => m !== currentFile)
  .map(path => ({
    dir: formatDir(dirname(path)),
    file: basename(path),
  }))

const state = { val: '', files: [], cache: [], vis: false, ix: 0, currentFile: '', loading: false }

const hidden = { display: 'none' }
const container = {
  display: 'flex',
  width: '100%',
  'justify-content': 'center',
  'align-items': 'flex-start',
}

const pretty = {
  width: '400px',
  background: '#333',
  'margin-top': '15%'
}

const view = ({ val, files, vis, ix, loading }: any, { change, cancel, select, next, prev }: any) => h('#files', {
  style: vis ? container : hidden
}, [
  h('div', { style: pretty }, [
    TermInput({ focus: true, val, next, prev, change, cancel, select, loading }),

    h('div', files.map((f: any, key: number) => h('.row', {
      key,
      css: { active: key === ix },
    }, [
      h('span', { style: { color: '#666' } }, f.dir),
      h('span', f.file)
    ]))),
  ])
])

const actions = {
  show: (s: any, a: any, currentFile: string) => {
    viminput.blur()
    vim.hideCursor()
    a.loading()
    return { vis: true, currentFile, files: s.cache }
  },

  cancel: () => {
    cancel()
    setImmediate(() => viminput.focus())
    vim.showCursor()
    return { val: '', vis: false, ix: 0, loading: false }
  },

  select: (s: any, a: any) => {
    const { dir, file } = s.files[s.ix]
    if (file) cmd (`e ${dir}${file}`)
    a.cancel()
  },

  change: (_s: any, _a: any, val: string) => {
    query(val)
    return { val }
  },

  // TODO: why not work?
  loading: async () => {
    console.log('loading async pls?')
    await delay(200)
    console.log('load=true')
    return { loading: true }
  },

  done: () => ({ loading: false }),
  initial: (s: any, _a: any, files: string[]) => ({ cache: asDirFile(files, s.currentFile) }),
  results: (s: any, _a: any, files: string[]) => ({ files: asDirFile(files, s.currentFile) }),
  next: (s: any) => ({ ix: s.ix + 1 > 9 ? 0 : s.ix + 1 }),
  prev: (s: any) => ({ ix: s.ix - 1 < 0 ? 9 : s.ix - 1 }),
}

const events = {
  show: (_s: any, actions: any, currentFile: string) => actions.show(currentFile),
  initial: (_s: any, actions: any, files: string[]) => actions.initial(files),
  results: (_s: any, actions: any, files: string[]) => actions.results(files),
  done: (_s: any, actions: any) => actions.done(),
}

const emit = ui({ state, view, actions, events, root: document.getElementById('plugins') })

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
