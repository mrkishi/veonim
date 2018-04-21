import { Plugin } from '../components/plugin-container'
import Input from '../components/text-input2'
import { createVim } from '../core/sessions'
import { action } from '../core/neovim'
import { app } from '../ui/uikit2'

const state = {
  value: '',
  visible: false,
}

type S = typeof state

const actions = {
  show: () => ({ visible: true }),
  hide: () => ({ value: '', visible: false }),
  change: (_s: S, value: string) => ({ value }),
  select: (s: S) => {
    s.value && createVim(s.value)
    return { value: '', visible: false }
  },
}

const ui = app({ name: 'vim-create', state, actions, view: ($, a) => Plugin($.visible, [

  ,Input({
    hide: a.hide,
    select: a.select,
    change: a.change,
    value: $.value,
    focus: true,
    icon: 'FolderPlus',
    desc: 'create new vim session',
  })

]) })

action('vim-create', ui.show)
