import { app, style, Actions } from '../ui/uikit'
import { action, on } from '../core/neovim'

interface State { vis: boolean }
const state: State = { vis: false }
const NC = style('div')({ background: `url('../assets/nc.gif')` })

const view = ({ vis }: State) => NC({
  style: {
    position: 'absolute',
    display: vis ? 'block' : 'none',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '75vw',
    height: '100%',
    width: '100%',
  },
})

const a: Actions<State> = {}

a.show = () => ({ vis: true })
a.hide = s => {
  if (s.vis) return { vis: false }
}

const ui = app({ state, view, actions: a }, false)

action('nc', () => ui.show())
on.cursorMove(() => ui.hide())
