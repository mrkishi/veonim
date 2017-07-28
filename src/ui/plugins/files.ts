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

const segreateParts = (text: string, slices: number[][]) => slices.length ? slices.reduce((res, [s,e], ix, arr) => {
  const prevEnd = (arr[ix - 1] || [])[1] + 1 || 0
  const l = text.slice(prevEnd, s)
  const u = text.slice(s, e + 1)
  res.push({ str: l, match: false })
  res.push({ str: u, match: true })
  if (ix === arr.length - 1) res.push({ str: text.slice(e + 1), match: false })
  return res
}, [] as any[]) : [{ str: text, match: false }]

const colorMatches = (matches: any[], dir: string, file: string) => {
  const fstart = dir.length
  const fend = dir.length + file.length - 1

  const fileHi = matches
    .filter((m: any[]) => m[0] >= fstart && m[1] <= fend)
    .map((m: any[]) => [ m[0] - fstart, m[1] - fend ])

  const dirHi = matches.filter((m: any[]) => m[0] <= fstart && m[1] <= fstart)

  const dirSpans = segreateParts(dir, dirHi).map(({ str, match }) => h('span', {
    style: { color: match ? '#b7a126' : '#666' }
  }, str))

  const fileSpans = segreateParts(file, fileHi).map(({ str, match }) => h('span', {
    style: { color: match ? '#b7a126' : '#999' }
  }, str))

  return [...dirSpans, ...fileSpans]
}

const listResults = (f: any) => f.matches
  ? colorMatches(f.matches[0].indices, f.item.dir, f.item.base)
  : [
    h('span', { style: { color: '#666' } }, f.dir),
    h('span', f.base)
  ]

const view = ({ val, files, vis }: any, { change, select }: any) => h('#files', {
  style: vis ? container : hidden
}, [
  h('div', { style: pretty }, [
    TermInput({
      val,
      focus: true,
      onchange: change,
      // oncancel: cancel,
      onselect: select,
    }),

    h('div', files.map((f: any, key: number) => h('.row', {
      key,
      // TODO: need to keep track of selected item
      css: { active: key === 0 },
    }, listResults(f)))),
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
  files.fuse = new Fuse(fileResults || [], { keys: ['name'], includeMatches: true, minMatchCharLength: 2 })

  emit('show')
}
