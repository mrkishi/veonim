import { renameCurrent, getCurrentName } from '../core/sessions'
import { Plugin } from '../components/plugin-container'
import Input from '../components/text-input'
import { action } from '../core/neovim'
import { Edit } from 'hyperapp-feather'
import { app } from '../ui/uikit'

const state = {
  value: '',
  visible: false,
}

type S = typeof state

const actions = {
  show: (value: string) => ({ value, visible: true }),
  hide: () => ({ value: '', visible: false }),
  change: (value: string) => ({ value }),
  select: () => (s: S) => {
    s.value && renameCurrent(s.value)
    return { value: '', visible: false }
  },
}

const view = ($: S, a: typeof actions) => Plugin($.visible, [

  ,Input({
    hide: a.hide,
    select: a.select,
    change: a.change,
    value: $.value,
    focus: true,
    icon: Edit,
    desc: 'rename vim session',
  })

])

const ui = app({ name: 'vim-rename', state, actions, view })
action('vim-rename', () => ui.show(getCurrentName()))
