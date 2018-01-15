import { h, app, Actions, ActionCaller } from '../ui/uikit'
import { activeWindow } from '../core/windows'
import { action, call } from '../core/neovim'
import Input from '../components/text-input'
import { filter } from 'fuzzaldrin-plus'
import { cursor } from '../core/cursor'
import { Row } from '../styles/common'
import { translate } from '../ui/css'

interface State {
  id: number,
  vis: boolean,
  val: string,
  desc: string,
  items: string[],
  cache: string[],
  ix: number,
  x: number,
  y: number,
}

const state: State = {
  id: 0,
  vis: false,
  val: '',
  items: [],
  cache: [],
  desc: '',
  ix: 0,
  x: 0,
  y: 0,
}

const view = ($: State, actions: ActionCaller) => h('#user-overlay-menu', {
  style: {
    display: $.vis ? 'flex' : 'none',
    'z-index': 100,
    position: 'absolute',
    transform: translate($.x, $.y),
  },
}, [
  ,h('div', {
    style: {
      background: 'rgb(20, 20, 20)',
    }
  }, [

    ,Input({
      ...actions,
      val: $.val,
      focus: true,
      small: true,
      icon: 'search',
      desc: $.desc,
    })

    ,h('div', $.items.map((item, key: number) => Row.normal({ key, activeWhen: key === $.ix }, item)))

  ])
])

const a: Actions<State> = {}

a.select = (s, a) => {
  if (!s.items.length) return a.hide()
  const item = s.items[s.ix]
  if (item) call.VeonimCallback(s.id, item)
  a.hide()
}

// TODO: not harcoded to 14
a.change = (s, _a, val: string) => ({ val, items: val
  ? filter(s.cache, val).slice(0, 14)
  : s.cache.slice(0, 14)
})

a.show = (_s, _a, { x, y, id, items, desc }) => ({ x, y, id, desc, items, cache: items, vis: true })
a.hide = () => ({ val: '', vis: false, ix: 0 })
a.next = s => ({ ix: s.ix + 1 > Math.min(s.items.length - 1, 13) ? 0 : s.ix + 1 })
a.prev = s => ({ ix: s.ix - 1 < 0 ? Math.min(s.items.length - 1, 13) : s.ix - 1 })

const ui = app({ state, view, actions: a })

action('user-overlay-menu', (id: number, desc: string, items = []) => {
  if (!items.length) return
  const { row, col } = cursor
  const x = activeWindow() ? activeWindow()!.colToX(col) : 0
  // TODO: anchorBottom maybe?
  const y = activeWindow() ? activeWindow()!.rowToY(row) : 0
  ui.show({ x, y, id, items, desc })
})
