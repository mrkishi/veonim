import { action, current, call, cmd } from '../neovim'
import { VimBuffer } from '../../functions'
import { h, app, Actions } from '../uikit'
import { basename, dirname } from 'path'
import { filter } from 'fuzzaldrin-plus'
import { merge } from '../../utils'
import TermInput from './input'

interface BufferInfo { name: string, base: string, modified?: boolean, dir: string, duplicate: boolean }
interface State { val: string, buffers: BufferInfo[], cache: BufferInfo[], vis: boolean, ix: number }

const cleanup = (fullpath: string, cwd: string) => fullpath.includes(cwd)
  ? fullpath.split(cwd + '/')[1]
  : fullpath

const getBuffers = async (cwd: string): Promise<BufferInfo[]> => {
  const buffers = await call.Buffers()
  if (!buffers) return []
  
   return buffers
     .filter((m: VimBuffer, ix: number, arr: any[]) => arr.findIndex(e => e.name === m.name) === ix)
     .filter((m: VimBuffer) => !m.cur)
     .map(({ name, mod }) => ({
       name,
       base: basename(name),
       modified: mod,
       dir: cleanup(dirname(name), cwd)
     }))
    .map((m, ix, arr) => merge(m, {
      duplicate: arr.some((n, ixf) => ixf !== ix && n.base === m.base)
    }))
    .map(m => merge(m, {
      name: m.duplicate ? `${m.dir}/${m.base}` : m.base,
    }))
}

const state: State = { val: '', buffers: [], cache: [], vis: false, ix: 0 }

const view = ({ val, buffers, vis, ix }: State, { change, hide, select, next, prev }: any) => h('#buffers.plugin', {
  hide: !vis
}, [
  h('.dialog.medium', [
    TermInput({ focus: true, val, next, prev, change, hide, select }),

    h('.row', { render: !buffers.length }, '...'),

    h('div', buffers.map((f, key) => h('.row', {
      key,
      css: { active: key === ix },
    }, [
      h('span', {
        render: f.duplicate,
        style: { color: '#666' },
      }, `${f.dir}/`),
      h('span', f.duplicate ? f.base : f.name),
    ]))),
  ])
])

const a: Actions<State> = {}

a.select = (s, a) => {
  if (!s.buffers.length) return a.hide()
  const { name } = s.buffers[s.ix]
  if (name) cmd(`b ${name}`)
  a.hide()
}

a.change = (s, _a, val: string) => ({ val, buffers: val
  ? filter(s.cache, val, { key: 'name' }).slice(0, 10)
  : s.cache.slice(0, 10)
})

a.show = (_s, _a, buffers: BufferInfo[]) => ({ buffers, cache: buffers, vis: true })
a.hide = () => ({ val: '', vis: false, ix: 0 })
a.next = s => ({ ix: s.ix + 1 > Math.min(s.buffers.length - 1, 9) ? 0 : s.ix + 1 })
a.prev = s => ({ ix: s.ix - 1 < 0 ? Math.min(s.buffers.length - 1, 9) : s.ix - 1 })

const ui = app({ state, view, actions: a })

action('buffers', async () => {
  const buffers = await getBuffers(current.cwd)
  ui.show(buffers)
})
