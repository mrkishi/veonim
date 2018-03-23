import { h, app, Actions, ActionCaller } from '../ui/uikit'
import { action, current, cmd } from '../core/neovim'
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

const worker = Worker('project-file-finder')
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
    // TODO: loading is so fast that this flickers and looks janky
    // use debounce or throttle to only show this if a loading operation
    // has already been going for a few ms. e.g. 150ms or more, etc.
    //loading: $.loading,
  })

  ,h('div', $.files.map((f, key) => Row.files({ key, activeWhen: key === $.ix, }, [
    ,setiIcon.file(f.file)

    ,h('span', { style: { color: 'var(--foreground-50)' } }, f.dir)

    ,h('span', { style: {
      color: key === $.ix ? 'var(--foreground-b20)' : 'var(--foreground-30)'
    } }, f.file)
  ])))

])

const a: Actions<State> = {}

a.show = (s, _a, currentFile: string) => ({ vis: true, currentFile, files: s.cache, loading: true })

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

a.loadingDone = () => ({ loading: false })

a.next = s => ({ ix: s.ix + 1 > Math.min(s.files.length - 1, 9) ? 0 : s.ix + 1 })
a.prev = s => ({ ix: s.ix - 1 < 0 ? Math.min(s.files.length - 1, 9) : s.ix - 1 })

const ui = app({ state, view, actions: a })
worker.on.results((files: string[]) => ui.results(files))
worker.on.done(ui.loadingDone)

action('files', () => {
  worker.call.load(current.cwd)
  ui.show(current.file)
})
