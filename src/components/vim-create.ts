import { h, app, Actions } from '../ui/uikit'
import { createVim } from '../core/sessions'
import TermInput from '../components/input'
import { action } from '../core/neovim'

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

const ui = app({ state, view, actions: a })
action('vim-create', () => ui.show())
action('vim-create-dir', () => createVim('dir-unnamed', true))
