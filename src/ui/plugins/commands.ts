import { action, call, cmd, define } from '../neovim'
import { Actions, Events } from '../../utils'
import { onVimCreate } from '../sessions'
import { filter } from 'fuzzaldrin-plus'
import { h, app } from './plugins'
import TermInput from './input'

onVimCreate(() => define.Commands`
  silent! exe "norm! :''\\\\<c-a>\\\\"\\\\<home>let\\\\ cmds=\\\\"\\\\<cr>"
  return split(cmds, '\\\\s\\\\+')
`)

interface State { val: string, cmds: string[], cache: string[], vis: boolean, ix: number }
const state: State = { val: '', cmds: [], cache: [], vis: false, ix: 0 }

const view = ({ val, cmds, vis, ix }: State, { change, hide, select, next, prev, tab }: any) => h('#commands.plugin', {
  hide: !vis
}, [
  h('.dialog.medium', [
    TermInput({ focus: true, val, next, prev, change, hide, select, tab }),

    h('.row', { render: !cmds.length }, '...'),

    h('div', { render: !!val.length }, cmds.map((cmd, key) => h('.row', {
      key,
      css: { active: key === ix },
    }, cmd))),
  ])
])

const a: Actions<State> = {}

a.select = (s, a) => {
  if (!s.val) return a.hide()
  cmd(`${s.val}`)
  a.hide()
}

a.change = (s, _a, val: string) => ({ val, cmds: val
  ? filter(s.cache, val).slice(0, 10)
  : s.cache.slice(0, 10)
})

a.tab = s => {
  if (!s.cmds.length) return
  const cmd = s.cmds[s.ix]
  if (cmd) return ({ val: cmd + ' ' })
}

a.show = (_s, _a, d: string[]) => ({ vis: true, cmds: d.slice(0, 10), cache: d })
a.hide = () => ({ val: '', vis: false, ix: 0 })
a.next = s => ({ ix: s.ix + 1 > 9 ? 0 : s.ix + 1 })
a.prev = s => ({ ix: s.ix - 1 < 0 ? 9 : s.ix - 1 })

const e: Events<State> = {}

e.show = (_s, a, d: string[]) => a.show(d)

const emit = app({ state, view, actions: a, events: e })

action('commands', async () => {
  const cmds = await call.Commands()
  emit('show', cmds)
})
