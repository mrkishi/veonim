import { h, app, Actions, ActionCaller } from '../ui/uikit'
import { action, call, cmd } from '../core/neovim'
import { Plugin } from '../styles/common'

interface State {
  val: string,
  vis: boolean,
}

const state = {
  val: '',
  vis: false,
}

let pickedColor = ''

const view = ($: State, { hide, change }: ActionCaller) => Plugin.default('color-picker', $.vis, [
  ,h('input', {
    type: 'color',
    value: $.val,
    onchange: change,
    onkeydown: hide,
    onupdate: (e: HTMLInputElement) => e !== document.activeElement && e.focus(),
  })
])

const a: Actions<State> = {}

a.show = (_s, _a, val: string) => ({ val, vis: true })
a.change = (_s, _a, e: any) => { pickedColor = e.target.value }
a.hide = () => {
  if (pickedColor) cmd(`exec "normal! ciw${pickedColor}"`)
  return { val: '#ffffff', vis: false }
}

const ui = app({ state, view, actions: a })

action('pick-color', async () => {
  const word = await call.expand('<cword>')
  ui.show(word)
})
