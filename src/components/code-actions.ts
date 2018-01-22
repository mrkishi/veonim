import { h, app, Actions, ActionCaller } from '../ui/uikit'
import { Command } from 'vscode-languageserver-types'
import { runCodeAction } from '../ai/diagnostics'
import { activeWindow } from '../core/windows'
import Input from '../components/text-input'
import Overlay from '../components/overlay'
import { filter } from 'fuzzaldrin-plus'
import { Row } from '../styles/common'

interface State {
  x: number,
  y: number,
  val: string,
  visible: boolean,
  actions: Command[],
  cache: Command[],
  ix: number,
}

const state: State = {
  x: 0,
  y: 0,
  val: '',
  visible: false,
  actions: [],
  cache: [],
  ix: 0,
}

const view = ($: State, actions: ActionCaller) => Overlay({
  name: 'code-actions',
  x: $.x,
  y: $.y,
  zIndex: 100,
  maxWidth: 600,
  visible: $.visible,
  anchorAbove: false,
}, [

  ,h('div', {
    style: {
      background: 'var(--background-40)',
    }
  }, [

    ,Input({
      ...actions,
      val: $.val,
      focus: true,
      small: true,
      icon: 'code',
      desc: 'run code action',
    })

    ,h('div', $.actions.map((s, key: number) => Row.normal({ key, activeWhen: key === $.ix }, s.title)))

  ])

])

const a: Actions<State> = {}

a.show = (_s, _a, { x, y, actions }) => ({ x, y, actions, cache: actions, visible: true }),
a.hide = () => ({ val: '', visible: false })

a.change = (s, _a, val: string) => ({ val, actions: val
  ? filter(s.actions, val, { key: 'title' })
  : s.cache
})

a.select = (s, a) => {
  if (!s.actions.length) return a.hide()
  const action = s.actions[s.ix]
  if (action) runCodeAction(action)
  a.hide()
}

a.next = s => ({ ix: s.ix + 1 > s.actions.length - 1 ? 0 : s.ix + 1 })
a.prev = s => ({ ix: s.ix - 1 < 0 ? s.actions.length - 1 : s.ix - 1 })

const ui = app({ state, view, actions: a })

export const show = (row: number, col: number, actions: Command[]) => {
  if (!actions.length) return
  const x = activeWindow() ? activeWindow()!.colToX(col) : 0
  const y = activeWindow() ? activeWindow()!.rowToTransformY(row + 1) : 0
  ui.show({ x, y, actions })
}
