import { h, app, Actions, ActionCaller } from '../ui/uikit'
import { getDirFiles, exists } from '../support/utils'
import { action, current, cmd } from '../core/neovim'
import { renameCurrent } from '../core/sessions'
import { Plugin, Row } from '../styles/common'
import config from '../config/config-service'
import Input from '../components/text-input'
import { filter } from 'fuzzaldrin-plus'
import { join, sep } from 'path'
import { homedir } from 'os'

const $HOME = homedir()

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
  renameToDir: boolean,
}

const state: State = {
  val: '',
  cwd: '',
  path: '',
  paths: [],
  cache: [],
  vis: false,
  ix: 0,
  renameToDir: false,
}

const shorten = (path: string) => path.includes($HOME) ? path.replace($HOME, '~') : path
const absPath = (path = '') => path.startsWith('~') ? join($HOME, path.slice(1)) : path
const validPath = async (path = '') => {
  if (!path) return ''
  const fullpath = absPath(path)
  return await exists(fullpath) ? fullpath : ''
}

let ignored = config('explorer.ignore.dirs', m => ignored = m)
const filterDirs = (filedirs: FileDir[]) => filedirs.filter(f => f.dir && !ignored.includes(f.name))

let listElRef: HTMLElement

const view = ($: State, actions: ActionCaller) => Plugin.default('change-dir', $.vis, [

  ,Input({
    ...actions,
    val: $.val,
    focus: true,
    icon: 'home',
    desc: 'change project'
  })

  ,Row.important(shorten($.path))

  ,h('div', {
    onupdate: (e: HTMLElement) => listElRef = e,
    style: {
      'max-height': '50vh',
      'overflow-y': 'hidden',
    }
  }, $.paths.map(({ name }, key) => Row.normal({ key, activeWhen: key === $.ix }, name)))

])

const a: Actions<State> = {}

a.select = (s, a) => {
  if (!s.paths.length) return a.hide()
  const { name } = s.paths[s.ix]
  if (!name) return
  cmd(`cd ${join(s.path, name)}`)
  cmd(`pwd`)
  if (s.renameToDir) renameCurrent(name)
  return a.hide()
}

a.change = (s, _a, val: string) => ({ val, paths: val
  ? filterDirs(filter(s.paths, val, { key: 'name' }))
  : s.cache
})

a.tab = (s, a) => {
  if (!s.paths.length) return a.hide()
  const { name } = s.paths[s.ix]
  if (!name) return
  const path = join(s.path, name)
  getDirFiles(path).then(paths => a.show({ path, paths: filterDirs(paths) }))
}

a.jumpPrev = (s, a) => {
  const next = s.path.split(sep)
  next.pop()
  const path = join(sep, ...next)
  getDirFiles(path).then(paths => a.show({ path, paths: filterDirs(paths) }))
}

a.show = (s, _a, { paths, path, cwd = s.cwd, renameToDir }) => ({
  cwd, path, paths, renameToDir,
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

const go = async (userPath: string, renameToDir = false) => {
  const cwd = await validPath(userPath) || current.cwd
  const filedirs = await getDirFiles(cwd)
  const paths = filterDirs(filedirs)
  ui.show({ paths, cwd, path: cwd, renameToDir })
}

action('change-dir', (path = '') => go(path, false))
action('init-dir', (path = '') => go(path, true))
