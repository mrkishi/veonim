import { Command } from 'vscode-languageserver-types'
import { runCodeAction } from '../ai/diagnostics'
import { activeWindow } from '../core/windows'
import { h, app, Actions } from '../ui/uikit'
import Input from '../components/text-input'
import { filter } from 'fuzzaldrin-plus'
import { Row } from '../styles/common'
import { translate } from '../ui/css'

interface State {
  x: number,
  y: number,
  val: string,
  vis: boolean,
  actions: Command[],
  cache: Command[],
  ix: number,
}

const state: State = {
  x: 0,
  y: 0,
  val: '',
  vis: false,
  actions: [],
  cache: [],
  ix: 0,
}

const view = ({ x, y, val, vis, actions, ix }: State, { select, hide, change, next, prev }: any) => h('#code-actions', {
  style: {
    display: vis ? 'flex' : 'none',
    'z-index': 100,
    position: 'absolute',
    transform: translate(x, y),
  },
}, [
  ,h('div', {
    style: {
      background: 'rgb(20, 20, 20)',
    }
  }, [

    ,Input({
      val,
      next,
      prev,
      change,
      hide,
      select,
      icon: 'code',
      small: true,
      focus: true,
      desc: 'run code action',
    })

    ,h('div', actions.map((s, key: number) => Row({
      key,
      style: key === ix ? { background: 'rgba(255, 255, 255, 0.08)' } : undefined,
    }, s.title)))

  ])
])

const a: Actions<State> = {}

a.show = (_s, _a, { x, y, actions }) => ({ x, y, actions, cache: actions, vis: true }),
a.hide = () => ({ val: '', vis: false })

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
  const y = activeWindow() ? activeWindow()!.rowToY(row + 1) : 0
  ui.show({ x, y, actions })
}
