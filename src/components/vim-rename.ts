import { renameCurrent, getCurrentName } from '../core/sessions'
import { Plugin } from '../components/plugin-container'
import Input from '../components/text-input2'
import { action } from '../core/neovim'
import { app } from '../ui/uikit2'

const state = {
  value: '',
  visible: false,
}

type S = typeof state

const actions = {
  show: (_s: S, value: string) => ({ value, visible: true }),
  hide: () => ({ value: '', visible: false }),
  change: (_s: S, value: string) => ({ value }),
  select: (s: S) => {
    s.value && renameCurrent(s.value)
    return { value: '', visible: false }
  },
}

const ui = app({ name: 'vim-rename', state, actions, view: ($, a) => Plugin($.visible, [

  ,Input({
    focus: true,
    hide: a.hide,
    select: a.select,
    change: a.change,
    value: $.value,
    icon: 'edit',
    desc: 'rename vim session',
  })

]) })

action('vim-rename', () => ui.show(getCurrentName()))
