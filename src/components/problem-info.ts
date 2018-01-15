import * as canvasContainer from '../core/canvas-container'
import { activeWindow } from '../core/windows'
import { h, app, Actions } from '../ui/uikit'
import { translate } from '../ui/css'
import Icon from '../components/icon'

interface State {
  value: string,
  vis: boolean,
  x: number,
  y: number,
  anchorBottom: boolean,
}

interface ShowParams {
  row: number,
  col: number,
  data: string,
}

const state: State = {
  value: '',
  vis: false,
  x: 0,
  y: 0,
  anchorBottom: true,
}

let spacer: HTMLElement

const view = ($: State) => h('#problem-info', {
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
        // TODO: vim colors pls
        background: '#222',
        color: '#eee',
        padding: '8px',
        display: 'flex',
      }
    }, [

      ,h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          paddingRight: '8px',
        }
      }, [
        Icon('error', {
          color: '#ef2f2f',
          size: canvasContainer.font.size + 4,
        })
      ])

      ,h('div', $.value)

    ])
  ])
])

const a: Actions<State> = {}

a.hide = () => ({ vis: false })
a.show = (_s, _a, { value, row, col }) => ({
  value,
  x: activeWindow() ? activeWindow()!.colToX(col - 1) : 0,
  y: activeWindow() ? activeWindow()!.rowToTransformY(row > 2 ? row : row + 1) : 0,
  anchorBottom: row > 2,
  vis: true
})

const ui = app({ state, view, actions: a }, false)

export const show = ({ row, col, data }: ShowParams) => ui.show({ value: data, row, col })
export const hide = () => ui.hide()
