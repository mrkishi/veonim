import { Actions, Events, getDirFiles } from '../../utils'
import { call, notify } from '../neovim-client'
import { filter } from 'fuzzaldrin-plus'
import { h, app } from './plugins'
import { join, sep } from 'path'
import { homedir } from 'os'
import TermInput from './input'

const { cmd } = notify
const $HOME = homedir()

// TODO: handle paths outside of $HOME (fstat issues?)
// TODO: handle scroll down/up (populate all and overflow? keys scroll div?)
// TODO: filter .git dir and some other?

interface FileDir { name: string, file: boolean, dir: boolean  }
interface State { val: string, cwd: string, path: string, paths: FileDir[], cache: FileDir[], vis: boolean, ix: number }
const state: State = { val: '', cwd: '', path: '',  paths: [], cache: [], vis: false, ix: 0 }

const shorten = (path: string) => path.includes($HOME) ? path.replace($HOME, '~') : path
const relativeToCwd = (path: string, cwd: string) => path.includes(cwd) ? path.replace(cwd, '').replace(/^\//, '') : path

const view = ({ val, path, paths, vis, ix }: State, { onkey, change, hide, select, next, prev }: any) => h('#explorer.plugin', {
  hide: !vis
}, [
  h('.dialog.large', [
    TermInput({ focus: true, val, next, prev, change, hide, select, onkey }),

    h('.row', { render: !paths.length }, `it's empty here :(`),

    h('.row.important', shorten(path)),

    h('div', paths.map(({ name, dir }, key) => h('.row', {
      key,
      css: { active: key === ix },
    }, [
      h('span', { style: {
        color: dir ? '#888' : 'inherit'
      } }, name),
    ]))),
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

// TODO: instead of slice, need to scroll up/down
a.change = (s, _a, val: string) => ({ val, paths: val
  ? filter(s.paths, val, { key: 'name' }).slice(0, 20)
  : s.cache.slice(0, 20)
})

a.onkey = (_s, a, { val, meta, ctrl }) => {
  // because on mac cmd === meta && cmd is like ctrl on win/linux
  if ((meta || ctrl) && val === 'o') a.up()
}

a.down = (s, a, next) => {
  const path = join(s.path, next)
  getDirFiles(path).then(paths => a.show({ paths, path }))
}

a.up = (s, a) => {
  const next = s.path.split(sep)
  next.pop()
  const path = join(sep, ...next)
  getDirFiles(path).then(paths => a.show({ paths, path }))
}

a.show = (s, _a, { paths, path, cwd = s.cwd }) => ({
  cwd,
  path,
  val: '',
  vis: true,
  cache: paths,
  paths: paths.slice(0, 20),
})

a.hide = () => ({ val: '', path: '', vis: false, ix: 0 })
a.next = s => ({ ix: s.ix + 1 > 9 ? 0 : s.ix + 1 })
a.prev = s => ({ ix: s.ix - 1 < 0 ? 9 : s.ix - 1 })

const e: Events<State> = {}

e.show = (_s, a, d) => a.show(d)

const emit = app({ state, view, actions: a, events: e })

export default async () => {
  const cwd = await call.getcwd()
  if (!cwd) return

  const paths = await getDirFiles(cwd)
  emit('show', { paths, cwd, path: cwd })
}
