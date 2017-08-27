import { renameCurrent, getCurrentName } from '../sessions'
import { h, app, Actions } from '../uikit'
import { action } from '../neovim'
import TermInput from './input'

interface State { val: string, vis: boolean }
const state: State = { val: '', vis: false }

const view = ({ val, vis }: State, { select, hide, change }: any) => h('#vim-rename.plugin', {
  hide: !vis
}, [
  h('.dialog.small', [
    TermInput({ focus: true, val, select, hide, change }),
  ])
])

const a: Actions<State> = {}

a.show = (_s, _a, val: string) => ({ val, vis: true }),
a.hide = () => ({ val: '', vis: false })
a.change = (_s, _a, val: string) => ({ val })
a.select = (s, a) => {
  s.val && renameCurrent(s.val)
  a.hide()
}

const ui = app({ state, view, actions: a })
action('vim-rename', () => ui.show(getCurrentName()))
