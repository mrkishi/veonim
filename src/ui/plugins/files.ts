import { call, notify } from '../neovim-client'
import vim from '../canvasgrid'
import * as viminput from '../input'
import { basename, dirname } from 'path'
import huu from 'huu'
import TermInput from './input'
import { load, cancel, onResults, query, getInitial } from './deep-fuzzy-files'
const { h: hs, app } = require('hyperapp')
const { cmd } = notify
const h = huu(hs)

const formatDir = (dir: string) => dir === '.' ? '' : `${dir}/`

const asDirFile = (files: string[], currentFile: string) => files
  .filter(m => m !== currentFile)
  .map(path => ({
    dir: formatDir(dirname(path)),
    file: basename(path),
  }))

const state = { val: '', files: [], cache: [], vis: false, ix: 0, currentFile: '' }

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

const view = ({ val, files, vis, ix }: any, { change, cancel, select, next, prev }: any) => h('#files', {
  style: vis ? container : hidden
}, [
  h('div', { style: pretty }, [
    TermInput({ focus: true, val, next, prev, change, cancel, select }),

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
  show: (s: any, _a: any, currentFile: string) => {
    viminput.blur()
    vim.hideCursor()
    return { ...s, vis: true, currentFile, files: s.cache }
  },

  cancel: (s: any) => {
    cancel()
    setImmediate(() => viminput.focus())
    vim.showCursor()
    return { ...s, val: '', vis: false, ix: 0 }
  },

  select: (s: any, a: any) => {
    const { dir, file } = s.files[s.ix]
    if (file) cmd (`e ${dir}${file}`)
    a.cancel()
  },

  change: (s: any, _a: any, val: string) => {
    query(val)
    return { ...s, val }
  },

  initial: (s: any, _a: any, files: string[]) => ({ ...s, cache: asDirFile(files, s.currentFile) }),
  results: (s: any, _a: any, files: string[]) => ({ ...s, files: asDirFile(files, s.currentFile) }),
  next: (s: any) => ({ ...s, ix: s.ix + 1 > 9 ? 0 : s.ix + 1 }),
  prev: (s: any) => ({ ...s, ix: s.ix - 1 < 0 ? 9 : s.ix - 1 }),
}

const events = {
  show: (_s: any, actions: any, currentFile: string) => actions.show(currentFile),
  initial: (_s: any, actions: any, files: string[]) => actions.initial(files),
  results: (_s: any, actions: any, files: string[]) => actions.results(files),
}
const emit = app({ state, view, actions, events, root: document.getElementById('plugins') })

export default async () => {
  const cwd = await call.getcwd()
  if (!cwd) return

  load(cwd)
  onResults(files => emit('results', files))
  // TODO: show spinner, stop spinner for loading
  // whenDone(() => emit('stop-spinner'))
  const currentFile = await call.expand('%f')
  emit('show', currentFile)

  const first = await getInitial()
  emit('initial', first)
}
