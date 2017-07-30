import { Actions, Events } from '../../utils'
import { renameCurrent, getCurrentName } from '../sessions'
import { h, app } from './plugins'
import TermInput from './input'

interface State { val: string, vis: boolean, current: string }
const state: State = { val: '', vis: false, current: '' }

const view = ({ val, vis, current }: State, { select, hide, change }: any) => h('#vim-rename.plugin', {
  hide: !vis
}, [
  h('.dialog.small', [
    TermInput({ focus: true, desc: current, val, select, hide, change }),
  ])
])

const a: Actions<State> = {}

a.show = (_s, _a, current: string) => ({ current, vis: true }),
a.hide = () => ({ val: '', vis: false })
a.change = (_s, _a, val: string) => ({ val })
a.select = (s, a) => {
  s.val && renameCurrent(s.val)
  a.hide()
}

const e: Events<State> = {}
e.show = (_s, a, current: string) => a.show(current)

const emit = app({ state, view, actions: a, events: e })

export default () => emit('show', getCurrentName())