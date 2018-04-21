import { h, app, styled } from '../ui/uikit2'
import { action, on } from '../core/neovim'

const state = {
  visible: false,
}

type S = typeof state

const NC = styled.div`
  background: url('../assets/nc.gif');
`

const actions = {
  show: () => ({ visible: true }),
  hide: (s: S) => {
    if (s.visible) return { visible: false }
  },
}

const ui = app({ name: 'nc', state, actions, view: $ => h(NC, {
  style: {
    display: $.visible ? 'block' : 'none',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '75vw',
    position: 'absolute',
    height: '100%',
    width: '100%',
  },
}) })

action('nc', ui.show)
on.cursorMove(ui.hide)
