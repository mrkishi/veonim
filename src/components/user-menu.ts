import { h, app, Actions, ActionCaller } from '../ui/uikit'
import { Plugin, Row } from '../styles/common'
import { action, call } from '../core/neovim'
import Input from '../components/text-input'
import { filter } from 'fuzzaldrin-plus'

interface State {
  id: number,
  vis: boolean,
  val: string,
  desc: string,
  items: string[],
  cache: string[],
  ix: number,
}

const state: State = {
  id: 0,
  vis: false,
  val: '',
  items: [],
  cache: [],
  desc: '',
  ix: 0,
}

const view = ($: State, actions: ActionCaller) => Plugin.default('user-menu', $.vis, [
  ,Input({
    ...actions,
    val: $.val,
    desc: $.desc,
    focus: true,
    icon: 'search',
  })

  ,h('div', $.items.map((item, key) => Row.normal({ key, activeWhen: key === $.ix }, item)))

])

const a: Actions<State> = {}

a.select = (s, a) => {
  if (!s.items.length) return a.hide()
  const item = s.items[s.ix]
  if (item) call.VeonimCallback(s.id, item)
  a.hide()
}

a.change = (s, _a, val: string) => ({ val, items: val
  ? filter(s.cache, val).slice(0, 14)
  : s.cache.slice(0, 14)
})

a.show = (_s, _a, { id, items, desc }) => ({ id, desc, items, cache: items, vis: true })
a.hide = () => ({ val: '', vis: false, ix: 0 })
a.next = s => ({ ix: s.ix + 1 > Math.min(s.items.length - 1, 13) ? 0 : s.ix + 1 })
a.prev = s => ({ ix: s.ix - 1 < 0 ? Math.min(s.items.length - 1, 13) : s.ix - 1 })

const ui = app({ state, view, actions: a })

action('user-menu', (id: number, desc: string, items = []) =>
  items.length && ui.show({ id, items, desc }))
