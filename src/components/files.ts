import { action, current, call, cmd } from '../core/neovim'
import { h, app, Actions, ActionCaller } from '../ui/uikit'
import * as setiIcon from '../styles/seti-icons'
import { Plugin, Row } from '../styles/common'
import Input from '../components/text-input'
import { basename, dirname } from 'path'
import Worker from '../messaging/worker'

interface FileDir {
  dir: string,
  file: string,
}

interface State {
  val: string,
  files: FileDir[],
  cache: FileDir[],
  vis: boolean,
  ix: number,
  currentFile: string,
  loading: boolean,
}

const worker = Worker('fs-fuzzy')
const formatDir = (dir: string) => dir === '.' ? '' : `${dir}/`
const asDirFile = (files: string[], currentFile: string) => files
  .filter(m => m !== currentFile)
  .map(path => ({
    dir: formatDir(dirname(path)),
    file: basename(path),
  }))

const state: State = {
  val: '',
  files: [],
  cache: [],
  vis: false,
  ix: 0,
  currentFile: '',
  loading: false,
}

const view = ($: State, actions: ActionCaller) => Plugin.default('files', $.vis, [

  ,Input({
    ...actions,
    val: $.val,
    focus: true,
    icon: 'file-text',
    desc: 'open file',
  })

  ,h('div', $.files.map((f, key) => Row.files({ key, activeWhen: key === $.ix, }, [
    ,setiIcon.file(f.file)

    ,h('span', { style: { color: '#666' } }, f.dir)

    ,h('span', { style: { color: key === $.ix ? '#fff' : '#aaa' } }, f.file)
  ])))

])

const a: Actions<State> = {}

a.show = (s, _a, currentFile: string) => ({ vis: true, currentFile, files: s.cache })

a.hide = () => {
  worker.call.stop()
  return { val: '', vis: false, ix: 0, loading: false, cache: [], files: [] }
}

a.select = (s, a) => {
  if (!s.files.length) return a.hide()
  const { dir, file } = s.files[s.ix]
  if (file) cmd(`e ${dir}${file}`)
  a.hide()
}

a.change = (_s, _a, val: string) => {
  worker.call.query(val)
  return { val }
}

a.results = (s, _a, files: string[]) => ({
  cache: !s.cache.length ? files.slice(0, 10) : s.cache,
  files: asDirFile(files, s.currentFile)
})

a.next = s => ({ ix: s.ix + 1 > Math.min(s.files.length - 1, 9) ? 0 : s.ix + 1 })
a.prev = s => ({ ix: s.ix - 1 < 0 ? Math.min(s.files.length - 1, 9) : s.ix - 1 })

const ui = app({ state, view, actions: a })
worker.on.results((files: string[]) => ui.results(files))

action('files', async () => {
  worker.call.load(current.cwd)
  const currentFile = await call.expand('%f')
  ui.show(currentFile)
})
