import { sub, processAnyBuffered } from '../../dispatch'
import { ColorData } from '../../color-service'
import { h, app, Actions } from '../uikit'
import { translate } from '../css'
import vimUI from '../canvasgrid'

interface State {
  value: ColorData[][],
  vis: boolean,
  x: number,
  y: number,
  anchorBottom: boolean,
  fg: string,
}

interface ShowParams {
  row: number,
  col: number,
  data: ColorData[][],
}

const state: State = {
  value: [[]],
  vis: false,
  x: 0,
  y: 0,
  anchorBottom: true,
  fg: '#eee',
}

let spacer: HTMLElement

const view = ({ value, vis, x, y, anchorBottom, fg }: State) => h('#hover', {
  style: {
    display: vis ? 'flex' : 'none',
    position: 'absolute',
    transform: translate(0, y),
    width: '100%',
  }
}, [
  h('div', {
    onupdate: (e: HTMLElement) => {
      spacer = e
    },
    style: { flex: `${x}px`, }
  }),
  h('div', {
    onupdate: (e: HTMLElement) => setTimeout(() => {
      const { width } = e.getBoundingClientRect()
      const okSize = Math.floor(window.innerWidth * 0.7)
      spacer.style[(<any>'max-width')] = width > okSize ? '30vw' : `${x}px`
      e.style[(<any>'opacity')] = '1'
    }, 1),
    style: {
      transform: anchorBottom ? `translateY(-100%)` : undefined,
      opacity: '0',
    }
  }, [
    h('.hover', value.map(m => h('div', m.map(({ color, text }) => h('span', {
      style: {
        color: color || fg,
        'white-space': 'pre',
      }
    }, text))))),
  ]),
])

const a: Actions<State> = {}

a.show = (_s, _a, { value, row, col }) => ({
  value,
  x: vimUI.colToX(col - 1),
  y: vimUI.rowToY(row > 2 ? row : row + 1),
  anchorBottom: row > 2,
  vis: true
})
a.hide = () => ({ vis: false })
a.setFG = (_s, _a, fg) => ({ fg })

const ui = app({ state, view, actions: a }, false)

export const show = ({ row, col, data }: ShowParams) => ui.show({ value: data, row, col })
export const hide = () => ui.hide()

sub('colors.vim.fg', fg => ui.setFG(fg))
processAnyBuffered('colors.vim.fg')
