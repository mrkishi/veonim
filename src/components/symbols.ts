import { h, app, Actions, ActionCaller } from '../ui/uikit'
import { feedkeys, cmd } from '../core/neovim'
import { Plugin, Row } from '../styles/common'
import { Symbol } from '../langserv/adapter'
import Input from '../components/text-input'
import { filter } from 'fuzzaldrin-plus'

interface State {
  val: string,
  symbols: Symbol[],
  cache: Symbol[],
  vis: boolean,
  ix: number,
}

const state: State = {
  val: '',
  symbols: [],
  cache: [],
  vis: false,
  ix: 0,
}

const view = ($: State, actions: ActionCaller) => Plugin.default('symbols', $.vis, [

  ,Input({
    ...actions,
    val: $.val,
    focus: true,
    icon: 'moon',
    desc: 'go to symbol',
  })

  // TODO: pls scroll this kthx
  ,h('div', {
    style: {
      maxHeight: '50vh',
      overflowY: 'hidden',
    }
  }, $.symbols.map(({ name }, key) => Row.normal({ key, activeWhen: key === $.ix }, [
    // TODO: render symbol kind icon (26 different types...)
    ,h('span', name)
  ])))

])

const a: Actions<State> = {}

a.select = (s, a) => {
  if (!s.symbols.length) return a.hide()
  const { location: { cwd, file, position: { line, column } } } = s.symbols[s.ix]
  cmd(`e ${cwd}/${file}`)
  feedkeys(`${line}Gzz${column}|`)
  a.hide()
}

a.change = (s, _a, val: string) => ({ val, symbols: val
  ? filter(s.cache, val, { key: 'name' }).slice(0, 10)
  : s.cache.slice(0, 10)
})

a.show = (_s, _a, symbols: Symbol[]) => ({ symbols, cache: symbols, vis: true })
a.hide = () => ({ val: '', vis: false, ix: 0 })
a.next = s => ({ ix: s.ix + 1 > 9 ? 0 : s.ix + 1 })
a.prev = s => ({ ix: s.ix - 1 < 0 ? 9 : s.ix - 1 })

const ui = app({ state, view, actions: a })

export const show = (symbols: Symbol[]) => ui.show(symbols)
