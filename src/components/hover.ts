import * as canvasContainer from '../core/canvas-container'
import { current as vimstate } from '../core/neovim'
import { translate, paddingVH } from '../ui/css'
import { activeWindow } from '../core/windows'
import { h, app, Actions } from '../ui/uikit'
import { ColorData } from '../ai/hover'

interface State {
  value: ColorData[][],
  vis: boolean,
  x: number,
  y: number,
  anchorBottom: boolean,
  doc?: string,
}

interface ShowParams {
  row: number,
  col: number,
  data: ColorData[][],
  doc?: string,
}

const state: State = {
  value: [[]],
  vis: false,
  x: 0,
  y: 0,
  anchorBottom: true,
}

// TODO: dedup this style with autocomplete and others
const docs = (data: string) => h('div', {
  style: {
    overflow: 'visible',
    whiteSpace: 'normal',
    background: 'var(--background-45)',
    ...paddingVH(8, 6),
    fontSize: `${canvasContainer.font.size - 2}px`,
    color: 'rgba(255, 255, 255, 0.5)',
  }
}, data)

let spacer: HTMLElement

const view = ($: State) => h('#hover', {
  style: {
    display: $.vis ? 'flex' : 'none',
    position: 'absolute',
    transform: translate(0, $.y),
    width: '100%',
    maxWidth: '600px',
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
    $.doc && !$.anchorBottom && docs($.doc),

    ,h('div', {
      style: {
        background: 'var(--background-30)',
        color: '#eee',
        padding: '8px',
      }
    }, $.value.map(m => h('div', m.map(({ color, text }) => h('span', {
      style: {
        color: color || vimstate.fg,
        'white-space': 'pre',
      }
    }, text)))))

    ,$.doc && $.anchorBottom && docs($.doc),
  ])

])

const a: Actions<State> = {}

a.hide = () => ({ vis: false })
a.show = (_s, _a, { value, row, col, doc }) => ({
  doc,
  value,
  x: activeWindow() ? activeWindow()!.colToX(col - 1) : 0,
  y: activeWindow() ? activeWindow()!.rowToTransformY(row > 2 ? row : row + 1) : 0,
  anchorBottom: row > 2,
  vis: true
})

const ui = app({ state, view, actions: a }, false)

export const show = ({ row, col, data, doc }: ShowParams) => ui.show({ value: data, doc, row, col })
export const hide = () => ui.hide()
