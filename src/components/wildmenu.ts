import { h, app, Actions } from '../ui/uikit'
import { sub } from '../messaging/dispatch'
import vimUI from '../core/canvasgrid'
import { translate } from '../ui/css'

interface State {
  options: string[],
  vis: boolean,
  ix: number,
}

const state: State = {
  options: [],
  vis: false,
  ix: 0,
}

const x = vimUI.colToX(0)
const y = vimUI.rowToY(vimUI.rows - 1)

const view = ({ options, vis, ix }: State) => h('#wildmenu', {
  hide: !vis,
  style: {
    'z-index': 200,
    'min-width': '100px',
    'max-width': '500px',
    position: 'absolute',
    transform: translate(x, y),
  }
}, [
  h('div', {
    style: {
      transform: 'translateY(-100%)'
    }
  }, options.map((text, id) => h('.row.complete', {
    key: id,
    css: { active: id === ix },
  }, [
    h('span', text)
  ])))
])

const a: Actions<State> = {}

a.show = (_s, _a, options) => ({ options, ix: -1, vis: true })
a.hide = () => ({ vis: false, ix: 0 })
a.select = (_s, _a, ix: number) => ({ ix })

const ui = app({ state, view, actions: a }, false)

sub('wildmenu.show', opts => ui.show(opts))
sub('wildmenu.select', ix => ui.select(ix))
sub('wildmenu.hide', () => ui.hide())
