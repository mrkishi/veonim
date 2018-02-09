import { getDirFiles, pathRelativeToHome, pathRelativeToCwd, getDirs, $HOME } from '../support/utils'
import { action, current, call, cmd } from '../core/neovim'
import { h, app, Actions, ActionCaller } from '../ui/uikit'
import { Plugin, Row, colors } from '../styles/common'
import { join, sep, basename, dirname } from 'path'
import * as setiIcon from '../styles/seti-icons'
import config from '../config/config-service'
import Input from '../components/text-input'
import { filter } from 'fuzzaldrin-plus'

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
  pathMode: boolean,
  pathValue: string,
}

const state: State = {
  val: '',
  cwd: '',
  path: '',
  paths: [],
  cache: [],
  vis: false,
  ix: 0,
  pathMode: false,
  pathValue: '',
}

const ignored: { dirs: string[], files: string[] } = {
  dirs: config('explorer.ignore.dirs', m => ignored.dirs = m),
  files: config('explorer.ignore.files', m => ignored.files = m),
}

const sortDirFiles = (filedirs: FileDir[]) => {
  const dirs = filedirs.filter(f => f.dir && !ignored.dirs.includes(f.name))
  const files = filedirs.filter(f => f.file && !ignored.files.includes(f.name))
  return [...dirs, ...files]
}

const absolutePath = (path: string) => path.replace(/^~\//, `${$HOME}/`) 

const pathExplore = async (path: string) => {
  const fullpath = absolutePath(path)
  const complete = fullpath.endsWith('/')
  const dir = complete ? fullpath : dirname(fullpath)
  const top = basename(fullpath)
  const dirs = await getDirs(dir)
  const goodDirs = dirs.filter(d => !ignored.dirs.includes(d.name))
  return complete ? goodDirs : filter(goodDirs, top, { key: 'name' })
}

let listElRef: HTMLElement

const view = ($: State, actions: ActionCaller) => Plugin.default('explorer', $.vis, [

  ,Input({
    ...actions,
    val: $.val,
    focus: !$.pathMode,
    icon: 'hard-drive',
    desc: 'explorer',
  })

  ,!$.pathMode && Row.important(pathRelativeToHome($.path))

  ,$.pathMode && Input({
    change: actions.changePath,
    hide: actions.normalMode,
    select: actions.selectPath,
    tab: actions.completePath,
    val: $.pathValue,
    focus: true,
    background: 'var(--background-50)',
    color: colors.important,
    icon: 'search',
    desc: 'open path',
    small: true,
  })

  ,h('div', {
    onupdate: (e: HTMLElement) => listElRef = e,
    style: {
      maxHeight: '50vh',
      overflowY: 'hidden',
    }
  }, $.paths.map(({ name, dir }, key) => Row.normal({ key, activeWhen: key === $.ix }, [
    ,dir ? setiIcon.id('folder') : setiIcon.file(name)

    ,h('span', { style: { color: dir && key !== $.ix ? 'var(--foreground-50)' : undefined } }, name)
  ])))

])

const a: Actions<State> = {}

a.updatePathValue = (_s, _a, pathValue: string) => ({ pathValue })

a.ctrlG = (s, a) => {
  // because for whatever reason the 'onupdate' lifecycle event does not
  // get triggered on render pass including 'pathMode' value update
  setImmediate(() => a.updatePathValue(s.path))
  pathExplore(s.path).then(a.updatePaths)
  return { pathMode: true }
}

a.completePath = (s, a) => {
  if (!s.paths.length) return
  const dir = dirname(absolutePath(s.pathValue))
  const { name } = s.paths[s.ix]
  // TODO: if was ~ relative, also make it relative
  const next = `${join(dir, name)}/`
  a.changePath(next)
  return { pathValue: next }
}

a.normalMode = () => ({ pathMode: false })
a.updatePaths = (_s, _a, paths: string[]) => ({ paths })

a.selectPath = (s, a) => {
  getDirFiles(s.pathValue).then(paths => a.updatePaths(sortDirFiles(paths)))
  return { pathMode: false, path: s.pathValue }
}

a.changePath = (_s, a, pathValue: string) => {
  pathExplore(pathValue).then(a.updatePaths)
  return { pathValue }
}

a.select = (s, a) => {
  if (!s.paths.length) return a.hide()
  const { name, file } = s.paths[s.ix]
  if (!name) return
  if (file) {
    cmd(`e ${pathRelativeToCwd(join(s.path, name), s.cwd)}`)
    return a.hide()
  }
  a.diveDown(name)
}

a.change = (s, _a, val: string) => ({ val, paths: val
  ? sortDirFiles(filter(s.paths, val, { key: 'name' }))
  : s.cache
})

// TODO: conder using a.updatePaths
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
