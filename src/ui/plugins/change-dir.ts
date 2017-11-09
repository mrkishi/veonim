import { getDirFiles, exists } from '../../utils'
import { action, current, cmd } from '../neovim'
import { renameCurrent } from '../sessions'
import { h, app, Actions } from '../uikit'
import config from '../../config-service'
import { filter } from 'fuzzaldrin-plus'
import { join, sep } from 'path'
import TermInput from './input'
import { homedir } from 'os'

const $HOME = homedir()

interface FileDir { name: string, file: boolean, dir: boolean  }
interface State { val: string, cwd: string, path: string, paths: FileDir[], cache: FileDir[], vis: boolean, ix: number, renameToDir: boolean }
const state: State = { val: '', cwd: '', path: '',  paths: [], cache: [], vis: false, ix: 0, renameToDir: false }

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

const view = ({ val, path, paths, vis, ix }: State, { jumpPrev, change, hide, select, next, prev, scrollDown, scrollUp, top, bottom, tab }: any) => h('#change-dir.plugin', {
  hide: !vis
}, [
  h('.dialog.medium', [
    TermInput({ focus: true, val, next, prev, change, hide, select, jumpPrev, down: scrollDown, up: scrollUp, top, bottom, tab }),

    h('.row.important', shorten(path)),

    h('.row', { render: !paths.length }, `...`),

    h('div', {
      onupdate: (e: HTMLElement) => listElRef = e,
      style: {
        'max-height': '70vh',
        'overflow-y': 'hidden',
      }
    }, paths.map(({ name, dir }, key) => h('.row', {
      key,
      css: { active: key === ix, dim: dir },
    }, name))),
  ])
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
a.scrollDown = s => {
  listElRef.scrollTop += 300
  return { ix: Math.min(s.ix + 17, s.paths.length - 1) }
}

a.scrollUp = s => {
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
