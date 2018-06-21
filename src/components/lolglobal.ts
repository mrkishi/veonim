import { cmd, action } from '../core/neovim'
import { currentWindowElement } from '../core/windows'
import Input from '../components/text-input'
import { rgba, paddingV } from '../ui/css'
import * as Icon from 'hyperapp-feather'
import { makel } from '../ui/vanilla'
import { app, h } from '../ui/uikit'

const state = {
  value: '',
  focus: false,
  mode: 'n',
}

type S = typeof state

const actions = {
  show: (mode: string) => {
    currentWindowElement.add(containerEl)
    return { mode, focus: true }
  },
  hide: () => {
    currentWindowElement.remove(containerEl)
    cmd('undo')
    return { value: '', focus: false }
  },
  // TODO: only works if a search pattern exists
  // how can we detect if there is a search pattern
  // and run :g//norm ??cmds??
  // and if there isn't run :norm ??cmds??
  change: (value: string) => (s: S) => {
    const preprocess = value.length ? 'undo |' : ''
    const mm = s.mode === 'v' ? `'<,'>` : ''
    cmd(`${preprocess} ${mm}g@@norm N${value}` )
    return { value }
  },
  select: () => {
    currentWindowElement.remove(containerEl)
    return { value: '', focus: false }
  },
}

type A = typeof actions

const view = ($: S, a: A) => h('div', {
  style: {
    display: 'flex',
    flex: 1,
  },
}, [

  ,h('div', {
    style: {
      ...paddingV(20),
      display: 'flex',
      alignItems: 'center',
      // TODO: figure out a good color from the colorscheme... StatusLine?
      background: rgba(217, 150, 255, 0.17),
    }
  }, [
    ,h('span', 'multi normal')
  ])

  ,Input({
    small: true,
    focus: $.focus,
    value: $.value,
    desc: 'multi normal',
    icon: Icon.Camera,
    hide: a.hide,
    change: a.change,
    select: a.select,
  })

])

const containerEl = makel({
  position: 'absolute',
  width: '100%',
  display: 'flex',
  backdropFilter: 'blur(24px)',
  background: `rgba(var(--background-30-alpha), 0.6)`,
})

const ui = app<S, A>({ name: 'll', state, actions, view, element: containerEl })

action('llv', () => ui.show('v'))
action('lln', () => ui.show('n'))
