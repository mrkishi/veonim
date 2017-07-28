import { call, notify } from '../neovim-client'
import { cc } from '../../utils'
import vim from '../canvasgrid'
import * as viminput from '../input'
import * as glob from 'globby'
import { basename, dirname } from 'path'
import * as Fuse from 'fuse.js'
import huu from 'huu'
import TermInput from './input'
const { h: hs, app } = require('hyperapp')
const { cmd } = notify
const h = huu(hs)

const formatDir = (dir: string) => dir === '.' ? '' : `${dir}/`

interface SearchEntry {
  name: string,
  base: string,
  modified?: boolean,
  dir: string
}

// TODO: separate process to not block ui thread
// investigate other options? (rg, ag, find) if many files, we want to stream as found
const getProjectFiles = (cwd: string): Promise<string[]> => glob('**', {
  cwd,
  nosort: true,
  nodir: true,
  ignore: [
    '**/node_modules/**',
    '**/*.png',
    '**/*.jpg',
    '**/*.gif',
  ]
})

const getFiles = async (cwd: string): Promise<SearchEntry[]> => {
  const [ currentFile, files ] = await cc(call.expand('%f'), getProjectFiles(cwd))

  return files
    .filter((m: string) => m !== currentFile)
    .map((name: string) => ({
      name,
      base: basename(name),
      key: name,
      dir: formatDir(dirname(name))
    }))
}

const files: { raw: any[], fuse: Fuse } = { raw: [], fuse: new Fuse([], {}) }
const state = { val: '', files: [], vis: false, }

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

const view = ({ val, files, vis }: any, { change, cancel, select }: any) => h('#files', {
  style: vis ? container : hidden
}, [
  h('div', { style: pretty }, [
    TermInput({
      val,
      focus: true,
      onchange: change,
      oncancel: cancel,
      onselect: select,
    }),

    h('ul', files.slice(0, 10).map((f: any) => h('li', f.name))),
  ])
])

const actions = {
  show: (s: any) => {
    viminput.blur()
    vim.hideCursor()
    return { ...s, vis: true, files: files.raw.slice(0, 10).sort((a, b) => a.name.length - b.name.length) }
  },

  cancel: (s: any) => {
    setImmediate(() => viminput.focus())
    vim.showCursor()
    return { ...s, val: '', vis: false }
  },

  select: (s: any, a: any, val: string) => {
    if (val) cmd(`e ${s.files[0].name}`)
    a.cancel()
  },

  change: (s: any, _a: any, val: string) => ({ ...s, val, files: val
    ? files.fuse.search(val).slice(0, 10)
    : files.raw.slice(0, 10).sort((a, b) => a.name.length - b.name.length
  )}),
}

const events = {
  show: (_s: any, actions: any) => actions.show()
}

const emit = app({ state, view, actions, events, root: document.getElementById('plugins') })

export default async () => {
  const cwd = await call.getcwd().catch(e => console.log(e))
  if (!cwd) return
  const fileResults = await getFiles(cwd).catch(e => console.log(e))

  files.raw = fileResults || []
  files.fuse = new Fuse(fileResults || [], { keys: ['name'] })
  // other opts to consider:
  // includeMatches (for highlighting)
  // fine tune other params to be more like sequential search

  emit('show')
}
