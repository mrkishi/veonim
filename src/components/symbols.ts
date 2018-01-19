import { h, app, Actions, ActionCaller } from '../ui/uikit'
import { SymbolKind } from 'vscode-languageserver-types'
import { feedkeys, cmd } from '../core/neovim'
import { Plugin, Row } from '../styles/common'
import { Symbol } from '../langserv/adapter'
import Input from '../components/text-input'
import { filter } from 'fuzzaldrin-plus'
import Icon from '../components/icon'

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

const pos: { container: ClientRect } = {
  container: { left: 0, right: 0, bottom: 0, top: 0, height: 0, width: 0 }
}

const icons = new Map([
  [ SymbolKind.File, Icon('file', { color: '#a5c3ff' }) ],
  [ SymbolKind.Module, Icon('grid', { color: '#ff5f54' }) ],
  [ SymbolKind.Namespace, Icon('cloud-snow', { color: '#ffadc5' }) ],
  [ SymbolKind.Package, Icon('package', { color: '#ffa4d0' }) ],
  [ SymbolKind.Class, Icon('compass', { color: '#ffeb5b' }) ],
  [ SymbolKind.Method, Icon('box', { color: '#bb5ef1' }) ],
  [ SymbolKind.Property, Icon('disc', { color: '#54c8ff' }) ],
  [ SymbolKind.Field, Icon('feather', { color: '#9866ff' }) ],
  [ SymbolKind.Constructor, Icon('aperture', { color: '#c9ff56' }) ],
  [ SymbolKind.Enum, Icon('award', { color: '#84ff54' }) ],
  [ SymbolKind.Interface, Icon('map', { color: '#ffa354' }) ],
  [ SymbolKind.Function, Icon('share-2', { color: '#428aff' }) ],
  [ SymbolKind.Variable, Icon('database', { color: '#ff70e4' }) ],
  [ SymbolKind.Constant, Icon('triangle', { color: '#54ffe5' }) ],
  [ SymbolKind.String, Icon('star', { color: '#ffdca3' }) ],
  [ SymbolKind.Number, Icon('hash', { color: '#ff0c53' }) ],
  [ SymbolKind.Boolean, Icon('flag', { color: '#0c2dff' }) ],
  [ SymbolKind.Array, Icon('film', { color: '#0cffff' }) ],
  // TODO: but these exist in the protocol?
  //[ SymbolKind.Object, Icon('copy', { color: '#' }) ],
  //[ SymbolKind.Key, Icon('tag', { color: '#' }) ],
  //[ SymbolKind.Null, Icon('x-square', { color: '#' }) ],
  //[ SymbolKind.EnumMember, Icon('menu', { color: '#' }) ],
  //[ SymbolKind.Struct, Icon('layers', { color: '#' }) ],
  //[ SymbolKind.Event, Icon('video', { color: '#' }) ],
  //[ SymbolKind.Operator, Icon('anchor', { color: '#' }) ],
  //[ SymbolKind.TypeParameter, Icon('type', { color: '#' }) ],
])

const getSymbolIcon = (kind: SymbolKind) => icons.get(kind) || Icon('code')

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
    onupdate: (e: HTMLElement) => pos.container = e.getBoundingClientRect(),
    style: {
      maxHeight: '50vh',
      overflowY: 'hidden',
    }
  }, $.symbols.map(({ name, kind }, key) => Row.normal({
    key,
    activeWhen: key === $.ix,
    onupdate: (e: HTMLElement) => {
      if (key !== $.ix) return
      const { top, bottom } = e.getBoundingClientRect()
      if (top < pos.container.top) return e.scrollIntoView(true)
      if (bottom > pos.container.bottom) return e.scrollIntoView(false)
    },
  }, [
    ,h('div', {
      style: {
        display: 'flex',
        marginLeft: '-8px',
        // TODO: this doesn't scale with font size?
        width: '24px',
        marginRight: '8px',
        alignItems: 'center',
        justifyContent: 'center',
      }
    }, [
      getSymbolIcon(kind),
    ])

    ,h('span', name)

    // TODO: maybe also print out symbol description?
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
  // TODO: DON'T TRUNCATE!
  ? filter(s.cache, val, { key: 'name' }).slice(0, 10)
  : s.cache.slice(0, 10)
})

a.show = (_s, _a, symbols: Symbol[]) => ({ symbols, cache: symbols, vis: true })
a.hide = () => ({ val: '', vis: false, ix: 0 })
// TODO: DON'T TRUNCATE!
a.next = s => ({ ix: s.ix + 1 > 9 ? 0 : s.ix + 1 })
a.prev = s => ({ ix: s.ix - 1 < 0 ? 9 : s.ix - 1 })

const ui = app({ state, view, actions: a })

export const show = (symbols: Symbol[]) => ui.show(symbols)
