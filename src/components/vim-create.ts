import { Plugin } from '../components/plugin-container'
import Input from '../components/text-input'
import { createVim } from '../core/sessions'
import * as Icon from 'hyperapp-feather'
import { action } from '../core/neovim'
import { app } from '../ui/uikit'

const state = {
  value: '',
  visible: false,
}

type S = typeof state

const actions = {
  show: () => ({ visible: true }),
  hide: () => ({ value: '', visible: false }),
  change: (value: string) => ({ value }),
  select: () => (s: S) => {
    s.value && createVim(s.value)
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
    icon: Icon.FolderPlus,
    desc: 'create new vim session',
  })

])

const ui = app({ name: 'vim-create', state, actions, view })
action('vim-create', ui.show)
