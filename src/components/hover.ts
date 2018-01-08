import { current as vimstate } from '../core/neovim'
import { activeWindow } from '../core/windows'
import { h, app, Actions } from '../ui/uikit'
import { ColorData } from '../ai/hover'
import { translate } from '../ui/css'

interface State {
  value: ColorData[][],
  vis: boolean,
  x: number,
  y: number,
  anchorBottom: boolean,
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
}

let spacer: HTMLElement

const view = ($: State) => h('#hover', {
  style: {
    display: $.vis ? 'flex' : 'none',
    position: 'absolute',
    transform: translate(0, $.y),
    width: '100%',
  }
}, [

  ,h('div', {
    onupdate: (e: HTMLElement) => {
      spacer = e
    },
    style: { flex: `${$.x}px`, }
  })

  ,h('div', {
    onupdate: (e: HTMLElement) => setTimeout(() => {
      const { width } = e.getBoundingClientRect()
      const okSize = Math.floor(window.innerWidth * 0.7)
      spacer.style[(<any>'max-width')] = width > okSize ? '30vw' : `${$.x}px`
      e.style[(<any>'opacity')] = '1'
    }, 1),
    style: {
      transform: $.anchorBottom ? `translateY(-100%)` : undefined,
      opacity: '0',
    }
  }, [
    ,h('div', {
      style: {
        background: '#222',
        color: '#eee',
        padding: '8px',
      }
    }, $.value.map(m => h('div', m.map(({ color, text }) => h('span', {
      style: {
        color: color || vimstate.fg,
        'white-space': 'pre',
      }
    }, text)))))
  ])

])

const a: Actions<State> = {}

a.hide = () => ({ vis: false })
a.show = (_s, _a, { value, row, col }) => ({
  value,
  x: activeWindow() ? activeWindow()!.colToX(col - 1) : 0,
  y: activeWindow() ? activeWindow()!.rowToY(row > 2 ? row : row + 1) : 0,
  anchorBottom: row > 2,
  vis: true
})

const ui = app({ state, view, actions: a }, false)

export const show = ({ row, col, data }: ShowParams) => ui.show({ value: data, row, col })
export const hide = () => ui.hide()
