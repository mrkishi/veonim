import { activeWindow } from '../core/windows'
import { sub } from '../messaging/dispatch'
import { debounce } from '../support/utils'
import Overlay from '../components/overlay'
import { docStyle } from '../styles/common'
import { cursor } from '../core/cursor'
import { ColorData } from '../ai/hover'
import { h, app } from '../ui/uikit'
import { cvar } from '../ui/css'

export interface ShowParams {
  data: ColorData[][],
  doc?: string,
}

const docs = (data: string) => h('div', { style: docStyle }, [ h('div', data) ])

const getPosition = (row: number, col: number) => ({
  x: activeWindow() ? activeWindow()!.colToX(col - 1) : 0,
  y: activeWindow() ? activeWindow()!.rowToTransformY(row > 2 ? row : row + 1) : 0,
  anchorBottom: cursor.row > 2,
})

const state = {
  value: [[]] as ColorData[][],
  visible: false,
  anchorBottom: true,
  doc: '',
  x: 0,
  y: 0,
}

type S = typeof state

const actions = {
  hide: () => ({ visible: false }),
  show: ({ data, doc }: ShowParams) => ({
    ...getPosition(cursor.row, cursor.col),
    doc,
    value: data,
    visible: true,
  }),
  update: () => (s: S) => {
    if (!s.visible) return
    return getPosition(cursor.row, cursor.col)
  }
}

type A = typeof actions

const view = ($: S) => Overlay({
  x: $.x,
  y: $.y,
  maxWidth: 600,
  visible: $.visible,
  anchorAbove: $.anchorBottom,
}, [

  ,$.doc && !$.anchorBottom && docs($.doc)

  ,h('div', {
    style: {
      background: cvar('background-30'),
      padding: '8px',
    }
  }, $.value.map(m => h('div', {
    style: {
      display: 'flex',
      flexFlow: 'row wrap',
    }
  }, m.map(({ color, text }) => h('span', {
    style: {
      color: color || cvar('foreground'),
      whiteSpace: 'pre',
    }
  }, text)))))

  ,$.doc && $.anchorBottom && docs($.doc)

])

const ui = app<S, A>({ name: 'hover', state, actions, view })

sub('redraw', debounce(ui.update, 50))
