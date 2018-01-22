import { h, app, Actions, ActionCaller } from '../ui/uikit'
import { activeWindow } from '../core/windows'
import { action, call } from '../core/neovim'
import Input from '../components/text-input'
import Overlay from '../components/overlay'
import { filter } from 'fuzzaldrin-plus'
import { cursor } from '../core/cursor'
import { Row } from '../styles/common'

interface State {
  id: number,
  visible: boolean,
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
  visible: false,
  val: '',
  items: [],
  cache: [],
  desc: '',
  ix: 0,
  x: 0,
  y: 0,
}

const view = ($: State, actions: ActionCaller) => Overlay({
  name: 'user-overlay-menu',
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
      icon: 'user',
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

a.show = (_s, _a, { x, y, id, items, desc }) => ({ x, y, id, desc, items, cache: items, visible: true })
a.hide = () => ({ val: '', visible: false, ix: 0 })
a.next = s => ({ ix: s.ix + 1 > Math.min(s.items.length - 1, 13) ? 0 : s.ix + 1 })
a.prev = s => ({ ix: s.ix - 1 < 0 ? Math.min(s.items.length - 1, 13) : s.ix - 1 })

const ui = app({ state, view, actions: a })

action('user-overlay-menu', (id: number, desc: string, items = []) => {
  if (!items.length) return
  const x = activeWindow() ? activeWindow()!.colToX(cursor.col) : 0
  // TODO: anchorBottom maybe?
  const y = activeWindow() ? activeWindow()!.rowToTransformY(cursor.row + 1) : 0
  ui.show({ x, y, id, items, desc })
})
