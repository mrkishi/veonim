import { Actions, Events } from '../../utils'
import { h, app } from './plugins'
import { notify, call } from '../neovim-client'
const { cmd } = notify

interface State { val: string, vis: boolean }
const state = { val: '', vis: false }
let pickedColor = ''

const view = ({ vis, val }: State, { hide, change }: any) => h('#color-picker.plugin', {
  hide: !vis
}, [
  h('input', {
    type: 'color',
    value: val,
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

const e: Events<State> = {}
e.show = (_s, a, current: string) => a.show(current)

const emit = app({ state, view, actions: a, events: e })

export default async () => {
  const word = await call.expand('<cword>')
  emit('show', word)
}
