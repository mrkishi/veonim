import { Actions, Events, getDirFiles } from '../../utils'
import { call, notify } from '../neovim-client'
import { filter } from 'fuzzaldrin-plus'
import { h, app } from './plugins'
import { join, sep } from 'path'
import { homedir } from 'os'
import TermInput from './input'

const { cmd } = notify
const $HOME = homedir()

interface FileDir { name: string, file: boolean, dir: boolean  }
interface State { val: string, cwd: string, path: string, paths: FileDir[], cache: FileDir[], vis: boolean, ix: number }
const state: State = { val: '', cwd: '', path: '',  paths: [], cache: [], vis: false, ix: 0 }

const shorten = (path: string) => path.includes($HOME) ? path.replace($HOME, '~') : path
const relativeToCwd = (path: string, cwd: string) => path.includes(cwd) ? path.replace(cwd, '').replace(/^\//, '') : path

const ignored = { dirs: ['.git'], files: ['.DS_Store'] }

const sortDirFiles = (filedirs: FileDir[]) => {
  const dirs = filedirs.filter(f => f.dir && !ignored.dirs.includes(f.name))
  const files = filedirs.filter(f => f.file && !ignored.files.includes(f.name))
  return [...dirs, ...files]
}

let listElRef: HTMLElement

const view = ({ val, path, paths, vis, ix }: State, { jumpPrev, change, hide, select, next, prev, scrollDown, scrollUp, top, bottom }: any) => h('#explorer.plugin', {
  hide: !vis
}, [
  h('.dialog.large', [
    TermInput({ focus: true, val, next, prev, change, hide, select, jumpPrev, down: scrollDown, up: scrollUp, top, bottom }),

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
  const { name, file } = s.paths[s.ix]
  if (!name) return
  if (file) {
    cmd(`e ${relativeToCwd(join(s.path, name), s.cwd)}`)
    return a.hide()
  }
  a.down(name)
}

a.change = (s, _a, val: string) => ({ val, paths: val
  ? sortDirFiles(filter(s.paths, val, { key: 'name' }))
  : s.cache
})

a.down = (s, a, next) => {
  const path = join(s.path, next)
  getDirFiles(path).then(paths => a.show({ path, paths: sortDirFiles(paths) }))
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

const e: Events<State> = {}

e.show = (_s, a, d) => a.show(d)

const emit = app({ state, view, actions: a, events: e })

export default async () => {
  const cwd = await call.getcwd()
  if (!cwd) return

  const filedirs = await getDirFiles(cwd)
  const paths = sortDirFiles(filedirs)
  emit('show', { paths, cwd, path: cwd })
}
