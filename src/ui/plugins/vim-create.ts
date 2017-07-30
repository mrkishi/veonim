import { Actions, Events } from '../../utils'
import { createVim } from '../sessions'
import { h, app } from './plugins'
import TermInput from './input'

interface State { val: string, vis: boolean }
const state: State = { val: '', vis: false }

const view = ({ val, vis }: State, { select, hide, change }: any) => h('#vim-create.plugin', {
  hide: !vis
}, [
  h('.dialog.small', [
    TermInput({ focus: true, val, select, hide, change }),
  ])
])

const a: Actions<State> = {}

a.show = () => ({ vis: true }),
a.hide = () => ({ val: '', vis: false })
a.change = (_s, _a, val: string) => ({ val })
a.select = (s, a) => {
  s.val && createVim(s.val)
  a.hide()
}

const e: Events<State> = {}
e.show = (_s, a) => a.show()

const emit = app({ state, view, actions: a, events: e })

export default () => emit('show')