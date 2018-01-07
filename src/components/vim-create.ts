import { app, Actions, ActionCaller } from '../ui/uikit'
import { createVim } from '../core/sessions'
import Input from '../components/text-input'
import { Plugin } from '../styles/common'
import { action } from '../core/neovim'

interface State {
  val: string,
  vis: boolean,
}

const state: State = {
  val: '',
  vis: false,
}

const view = ($: State, actions: ActionCaller) => Plugin.default('vim-create', $.vis, [

  ,Input({
    ...actions,
    val: $.val,
    focus: true,
    icon: 'folder-plus',
    desc: 'create new vim session',
  })

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
