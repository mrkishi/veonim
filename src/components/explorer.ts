import { getDirFiles, pathRelativeToHome } from '../support/utils'
import { action, current, call, cmd } from '../core/neovim'
import { h, app, Actions, ActionCaller } from '../ui/uikit'
import * as setiIcon from '../styles/seti-icons'
import { Plugin, Row } from '../styles/common'
import config from '../config/config-service'
import Input from '../components/text-input'
import { filter } from 'fuzzaldrin-plus'
import { join, sep } from 'path'

interface FileDir {
  name: string,
  file: boolean,
  dir: boolean,
}

interface State {
  val: string,
  cwd: string,
  path: string,
  paths: FileDir[],
  cache: FileDir[],
  vis: boolean,
  ix: number,
}

const state: State = {
  val: '',
  cwd: '',
  path: '',
  paths: [],
  cache: [],
  vis: false,
  ix: 0,
}

const relativeToCwd = (path: string, cwd: string) => path.includes(cwd) ? path.replace(cwd, '').replace(/^\//, '') : path

const ignored: { dirs: string[], files: string[] } = {
  dirs: config('explorer.ignore.dirs', m => ignored.dirs = m),
  files: config('explorer.ignore.files', m => ignored.files = m),
}

const sortDirFiles = (filedirs: FileDir[]) => {
  const dirs = filedirs.filter(f => f.dir && !ignored.dirs.includes(f.name))
  const files = filedirs.filter(f => f.file && !ignored.files.includes(f.name))
  return [...dirs, ...files]
}

let listElRef: HTMLElement

const view = ($: State, actions: ActionCaller) => Plugin.default('explorer', $.vis, [

  ,Input({
    ...actions,
    val: $.val,
    focus: true,
    icon: 'hard-drive',
    desc: 'explorer',
  })

  ,Row.important(pathRelativeToHome($.path))

  ,h('div', {
    onupdate: (e: HTMLElement) => listElRef = e,
    style: {
      'max-height': '50vh',
      'overflow-y': 'hidden',
    }
  }, $.paths.map(({ name, dir }, key) => Row.normal({ key, activeWhen: key === $.ix }, [
    ,setiIcon.file(name)

    ,h('span', { style: { color: dir && key !== $.ix ? '#888' : undefined } }, name)
  ])))

])

const a: Actions<State> = {}

a.select = (s, a) => {
  if (!s.paths.length) return a.hide()
  const { name, file } = s.paths[s.ix]
  if (!name) return
  if (file) {
    cmd(`e ${relativeToCwd(join(s.path, name), s.cwd)}`)
    return a.hide()
  }
  a.diveDown(name)
}

a.change = (s, _a, val: string) => ({ val, paths: val
  ? sortDirFiles(filter(s.paths, val, { key: 'name' }))
  : s.cache
})

a.diveDown = (s, a, next) => {
  const path = join(s.path, next)
  getDirFiles(path).then(paths => a.show({ path, paths: sortDirFiles(paths) }))
}

a.ctrlH = async (_s, a) => {
  const { cwd } = current
  const filedirs = await getDirFiles(cwd)
  const paths = sortDirFiles(filedirs)
  a.show({ paths, cwd, path: cwd })
}

a.jumpPrev = (s, a) => {
  const next = s.path.split(sep)
  next.pop()
  const path = join(sep, ...next)
  getDirFiles(path).then(paths => a.show({ path, paths: sortDirFiles(paths) }))
}

a.show = (s, _a, { paths, path, cwd = s.cwd }) => ({
  cwd, path, paths,
  ix: 0,
  val: '',
  vis: true,
  cache: paths,
})

// TODO: be more precise than this? also depends on scaled devices
a.down = s => {
  listElRef.scrollTop += 300
  return { ix: Math.min(s.ix + 17, s.paths.length - 1) }
}

a.up = s => {
  listElRef.scrollTop -= 300
  return { ix: Math.max(s.ix - 17, 0) }
}

a.top = () => { listElRef.scrollTop = 0 }
a.bottom = () => { listElRef.scrollTop = listElRef.scrollHeight }
a.hide = () => ({ val: '', path: '', vis: false, ix: 0 })
a.next = s => ({ ix: s.ix + 1 >= s.paths.length ? 0 : s.ix + 1 })
a.prev = s => ({ ix: s.ix - 1 < 0 ? s.paths.length - 1 : s.ix - 1 })

const ui = app({ state, view, actions: a })

action('explorer', async () => {
  const { cwd } = current
  const path = await call.expand(`%:p:h`)
  const paths = sortDirFiles(await getDirFiles(path))
  ui.show({ cwd, path, paths })
})
