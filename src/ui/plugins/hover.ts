import { h, app, Actions } from '../uikit'
import { translate } from '../css'
import { ColorData } from '../../color-service'

interface State {
  value: ColorData[][],
  vis: boolean,
  x: number,
  y: number,
}

const state: State = {
  value: [[]],
  vis: false,
  x: 0,
  y: 0,
}

const view = ({ value, vis, x, y }: State) => h('#hover', {
  hide: !vis,
  style: {
    // TODO: need to anchor at bottom (if above) and top (if below)
    // multi-line line can cover up current line
    position: 'absolute',
    transform: translate(x, y),
  }
}, [
  h('.hover', value.map(m => h('div', m.map(({ color, text }) => h('span', {
    style: {
      color,
      'white-space': 'pre',
    }
  }, text))))),
])

const a: Actions<State> = {}

a.show = (_s, _a, { value, x, y }) => ({ value, x, y, vis: true })
a.hide = () => ({ vis: false })

const ui = app({ state, view, actions: a }, false)

export const show = ({ x, y, data }: { x: number, y: number, data: ColorData[][] }) => ui.show({ value: data, x, y })
export const hide = () => ui.hide()
