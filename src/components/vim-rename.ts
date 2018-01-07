import { renameCurrent, getCurrentName } from '../core/sessions'
import { app, Actions, ActionCaller } from '../ui/uikit'
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

const view = ($: State, actions: ActionCaller) => Plugin.default('vim-rename', $.vis, [

  ,Input({
    ...actions,
    val: $.val,
    focus: true,
    icon: 'moon',
    desc: 'rename vim session',
  })

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
