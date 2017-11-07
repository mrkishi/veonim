import { sub, processAnyBuffered } from '../../dispatch'
import { ColorData } from '../../color-service'
import { h, app, Actions } from '../uikit'
import { translate } from '../css'

interface State {
  value: ColorData[][],
  vis: boolean,
  x: number,
  y: number,
  fg: string,
}

interface ShowParams {
  x: number,
  y: number,
  data: ColorData[][],
}

const state: State = {
  value: [[]],
  vis: false,
  x: 0,
  y: 0,
  fg: '#eee',
}

const view = ({ value, vis, x, y, fg }: State) => h('#hover', {
  hide: !vis,
  style: {
    // TODO: need to anchor at bottom (if above) and top (if below)
    // because multi-line line can cover up current line
    position: 'absolute',
    transform: translate(x, y),
  }
}, [
  h('.hover', value.map(m => h('div', m.map(({ color, text }) => h('span', {
    style: {
      color: color || fg,
      'white-space': 'pre',
    }
  }, text))))),
])

const a: Actions<State> = {}

a.show = (_s, _a, { value, x, y }) => ({ value, x, y, vis: true })
a.hide = () => ({ vis: false })
a.setFG = (_s, _a, fg) => ({ fg })

const ui = app({ state, view, actions: a }, false)

export const show = ({ x, y, data }: ShowParams) => ui.show({ value: data, x, y })
export const hide = () => ui.hide()

sub('colors.vim.fg', fg => ui.setFG(fg))
processAnyBuffered('colors.vim.fg')
