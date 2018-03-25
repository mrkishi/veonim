import { h, app, Actions, ActionCaller } from '../ui/uikit'
import { list, switchVim } from '../core/sessions'
import { Plugin, Row } from '../styles/common'
import Input from '../components/text-input'
import { filter } from 'fuzzaldrin-plus'
import { action } from '../core/neovim'

interface Session {
  id: number,
  name: string,
}

interface State {
  val: string,
  vis: boolean,
  list: Session[],
  cache: Session[],
  ix: number,
}

const state: State = {
  val: '',
  vis: false,
  list: [],
  cache: [],
  ix: 0,
}

const view = ($: State, actions: ActionCaller) => Plugin.default('vim-switch', $.vis, [

  ,Input({
    ...actions,
    val: $.val,
    focus: true,
    icon: 'grid',
    desc: 'switch vim session',
  })

  ,h('div', $.list.map((s, key) => Row.normal({ key, activeWhen: key === $.ix }, s.name)))

])

const a: Actions<State> = {}

a.show = (_s, _a, d: Session[]) => ({ list: d, cache: d, vis: true }),
a.hide = () => ({ val: '', vis: false, ix: 0 })
a.change = (s, _a, val: string) => ({ val, list: val
  ? filter(s.list, val, { key: 'name' }).slice(0, 10)
  : s.cache.slice(0, 10)
})

a.select = (s, a) => {
  if (!s.list.length) return a.hide()
  const { id } = s.list[s.ix]
  if (id) switchVim(id)
  a.hide()
}

// TODO: don't limit list to 10 entries and scroll instead!
a.next = s => ({ ix: s.ix + 1 > Math.min(s.list.length - 1, 9) ? 0 : s.ix + 1 })
a.prev = s => ({ ix: s.ix - 1 < 0 ? Math.min(s.list.length - 1, 9) : s.ix - 1 })

const ui = app({ state, view, actions: a })
action('vim-switch', () => ui.show(list()))
