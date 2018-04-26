import { action, on } from '../core/neovim'
import { h, app } from '../ui/uikit'

const state = {
  visible: false,
}

type S = typeof state

const actions = {
  show: () => ({ visible: true }),
  hide: () => (s: S) => {
    if (s.visible) return { visible: false }
  },
}

const view = ($: S) => h('div', {
  style: {
    background: `url('../assets/nc.gif')`,
    display: $.visible ? 'block' : 'none',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '75vw',
    position: 'absolute',
    height: '100%',
    width: '100%',
  },
})

const ui = app({ name: 'nc', state, actions, view })

action('nc', ui.show)
on.cursorMove(ui.hide)
