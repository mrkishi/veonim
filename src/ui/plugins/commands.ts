import { Actions, Events } from '../../utils'
import { call, notify, define } from '../neovim-client'
//import { filter } from 'fuzzaldrin-plus'
import { onVimCreate } from '../sessions'
import { h, app } from './plugins'
import TermInput from './input'
const { cmd } = notify

interface State { val: string, cmds: string[], vis: boolean, ix: number }

onVimCreate(() => define.ListCustomCommands`
  let [save_verbose, save_verbosefile] = [&verbose, &verbosefile]
  set verbose=0 verbosefile=
  redir => res
  silent! execute 'command'
  redir END
  let [&verbose, &verbosefile] = [save_verbose, save_verbosefile]
  return res
`)

onVimCreate(() => define.ListCommandsStartingWith`
  silent! exe "norm! :".a:0."\<c-a>\"\<home>let\ cmds=\"\<cr>"
  let cmds = substitute(cmds, '\s\+', '\n', 'g')
  return cmds
`)

const state: State = { val: '', cmds: [], vis: false, ix: 0 }

const view = ({ val, cmds, vis, ix }: State, { change, hide, select, next, prev }: any) => h('#commands.plugin', {
  hide: !vis
}, [
  h('.dialog.medium', [
    TermInput({ focus: true, val, next, prev, change, hide, select }),

    h('.row', { render: !cmds.length }, '...'),

    h('div', cmds.map((cmd, key) => h('.row', {
      key,
      css: { active: key === ix },
    }, cmd))),
  ])
])

const a: Actions<State> = {}

a.select = (s, a) => {
  if (!s.cmds.length) return a.hide()
  const name = s.cmds[s.ix]
  if (name) cmd(`${name}`)
  a.hide()
}

a.change = (_s, a, val: string) => {
  call.ListCommandsStartingWith(val).then(cmds => a.listcmds(cmds))
  return ({ val })
}

a.listcmds = (_s, _a, cmds: string[]) =>{
  return { cmds }
  }
  //? filter(s.cmds, val, { key: 'name' }).slice(0, 10)

a.show = () => ({ vis: true })
a.hide = () => ({ val: '', vis: false, ix: 0 })
a.next = s => ({ ix: s.ix + 1 > 9 ? 0 : s.ix + 1 })
a.prev = s => ({ ix: s.ix - 1 < 0 ? 9 : s.ix - 1 })

const e: Events<State> = {}

e.show = (_s, a) => a.show()

const emit = app({ state, view, actions: a, events: e })

export default async () => emit('show')
