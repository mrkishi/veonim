import { feedkeys, cmd, current as vimState } from '../core/neovim'
import { workspaceSymbols, Symbol } from '../langserv/adapter'
import { SymbolKind } from 'vscode-languageserver-types'
import { Plugin } from '../components/plugin-container'
import { RowNormal } from '../components/row-container'
import Input from '../components/text-input'
import { filter } from 'fuzzaldrin-plus'
import Icon from '../components/icon'
import { h, app } from '../ui/uikit'

export enum SymbolMode {
  Buffer,
  Workspace,
}

const state = {
  loading: false,
  mode: SymbolMode.Buffer,
  value: '',
  symbols: [] as Symbol[],
  cache: [] as Symbol[],
  visible: false,
  index: 0,
}

type S = typeof state

const pos: { container: ClientRect } = {
  container: { left: 0, right: 0, bottom: 0, top: 0, height: 0, width: 0 }
}

const icons = new Map([
  [ SymbolKind.File, Icon('file', { color: '#a5c3ff' }) ],
  [ SymbolKind.Module, Icon('grid', { color: '#ff5f54' }) ],
  [ SymbolKind.Namespace, Icon('CloudSnow', { color: '#ffadc5' }) ],
  [ SymbolKind.Package, Icon('package', { color: '#ffa4d0' }) ],
  [ SymbolKind.Class, Icon('compass', { color: '#ffeb5b' }) ],
  [ SymbolKind.Method, Icon('box', { color: '#bb5ef1' }) ],
  [ SymbolKind.Property, Icon('disc', { color: '#54c8ff' }) ],
  [ SymbolKind.Field, Icon('feather', { color: '#9866ff' }) ],
  [ SymbolKind.Constructor, Icon('aperture', { color: '#c9ff56' }) ],
  [ SymbolKind.Enum, Icon('award', { color: '#84ff54' }) ],
  [ SymbolKind.Interface, Icon('map', { color: '#ffa354' }) ],
  [ SymbolKind.Function, Icon('Share2', { color: '#6da7ff' }) ],
  [ SymbolKind.Variable, Icon('database', { color: '#ff70e4' }) ],
  [ SymbolKind.Constant, Icon('save', { color: '#54ffe5' }) ],
  [ SymbolKind.String, Icon('star', { color: '#ffdca3' }) ],
  [ SymbolKind.Number, Icon('hash', { color: '#ff0c53' }) ],
  [ SymbolKind.Boolean, Icon('flag', { color: '#0c2dff' }) ],
  [ SymbolKind.Array, Icon('film', { color: '#0cffff' }) ],
  // TODO: enable when protocol upgrade to 3.6.0 in npm
  //[ SymbolKind.Object, Icon('copy', { color: '#' }) ],
  //[ SymbolKind.Key, Icon('tag', { color: '#' }) ],
  //[ SymbolKind.Null, Icon('x-square', { color: '#' }) ],
  //[ SymbolKind.EnumMember, Icon('menu', { color: '#' }) ],
  //[ SymbolKind.Struct, Icon('layers', { color: '#' }) ],
  //[ SymbolKind.Event, Icon('video', { color: '#' }) ],
  //[ SymbolKind.Operator, Icon('anchor', { color: '#' }) ],
  //[ SymbolKind.TypeParameter, Icon('type', { color: '#' }) ],
])

const symbolDescription = new Map([
  [ SymbolKind.File, 'File' ],
  [ SymbolKind.Module, 'Module' ],
  [ SymbolKind.Namespace, 'Namespace' ],
  [ SymbolKind.Package, 'Package' ],
  [ SymbolKind.Class, 'Class' ],
  [ SymbolKind.Method, 'Method' ],
  [ SymbolKind.Property, 'Property' ],
  [ SymbolKind.Field, 'Field' ],
  [ SymbolKind.Constructor, 'Constructor' ],
  [ SymbolKind.Enum, 'Enum' ],
  [ SymbolKind.Interface, 'Interface' ],
  [ SymbolKind.Function, 'Function' ],
  [ SymbolKind.Variable, 'Variable' ],
  [ SymbolKind.Constant, 'Constant' ],
  [ SymbolKind.String, 'String' ],
  [ SymbolKind.Number, 'Number' ],
  [ SymbolKind.Boolean, 'Boolean' ],
  [ SymbolKind.Array, 'Array' ],
  // TODO: enable when protocol upgrade to 3.6.0 in npm
  //[ SymbolKind.Object, 'Object' ],
  //[ SymbolKind.Key, 'Key' ],
  //[ SymbolKind.Null, 'Null' ],
  //[ SymbolKind.EnumMember, 'EnumMember' ],
  //[ SymbolKind.Struct, 'Struct' ],
  //[ SymbolKind.Event, 'Event' ],
  //[ SymbolKind.Operator, 'Operator' ],
  //[ SymbolKind.TypeParameter, 'TypeParameter' ],
])

const getSymbolIcon = (kind: SymbolKind) => icons.get(kind) || Icon('code')
const getSymbolDescription = (kind: SymbolKind) => symbolDescription.get(kind) || ''

const symbolCache = (() => {
  let cache: Symbol[] = []

  const clear = () => cache = []
  const find = (query: string) => filter(cache, query, { key: 'name' })

  const update = (symbols: Symbol[]) => {
    symbols.forEach(s => {
      const alreadyHas = cache.some(m => m.name === s.name)
      if (!alreadyHas) cache.push(s)
    })
  }

  return { update, find, clear }
})()

const resetState = { value: '', visible: false, index: 0, loading: false }

const actions = {
  select: () => (s: S) => {
    if (!s.symbols.length) return (symbolCache.clear(), resetState)
    const { location: { cwd, file, position: { line, column } } } = s.symbols[s.index]
    cmd(`e ${cwd}/${file}`)
    feedkeys(`${line}Gzz${column}|`)
    return (symbolCache.clear(), resetState)
  },

  change: (value: string) => (s: S) => {
    if (s.mode === SymbolMode.Buffer) return { value, symbols: value
      // TODO: DON'T TRUNCATE!
      ? filter(s.cache, value, { key: 'name' }).slice(0, 10)
      : s.cache.slice(0, 10)
    } 

    if (s.mode === SymbolMode.Workspace) {
      workspaceSymbols(vimState, value).then(symbols => {
        symbolCache.update(symbols)
        const results = symbols.length ? symbols : symbolCache.find(value)
        ui.updateOptions(results)
      })

      return { value, loading: true }
    }
  },

  updateOptions: (symbols: Symbol[]) => ({ symbols, loading: false }),

  show: ({ symbols, mode }: any) => ({ mode, symbols, cache: symbols, visible: true }),
  hide: () => {
    symbolCache.clear()
    return resetState
  },
  // TODO: DON'T TRUNCATE!
  next: () => (s: S) => ({ index: s.index + 1 > 9 ? 0 : s.index + 1 }),
  prev: () => (s: S) => ({ index: s.index - 1 < 0 ? 9 : s.index - 1 }),
}

const view = ($: S, a: typeof actions) => Plugin($.visible, [

  ,Input({
    select: a.select,
    change: a.change,
    hide: a.hide,
    next: a.next,
    prev: a.prev,
    value: $.value,
    loading: $.loading,
    focus: true,
    icon: 'moon',
    desc: 'go to symbol',
  })

  // TODO: pls scroll this kthx
  ,h('div', {
    ref: (e: HTMLElement) => {
      if (!e || !e.getBoundingClientRect) return
      pos.container = e.getBoundingClientRect()
    },
    style: {
      maxHeight: '50vh',
      overflowY: 'hidden',
    }
  }, $.symbols.map(({ name, kind, location }, ix) => h(RowNormal, {
    key: `${name}-${kind}-${location.cwd}-${location.file}-${location.position.line}-${location.position.column}`,
    style: { justifyContent: 'space-between' },
    active: ix === $.index,
    ref: (e: HTMLElement) => {
      if (ix !== $.index || !e || !e.getBoundingClientRect) return
      const { top, bottom } = e.getBoundingClientRect()
      if (top < pos.container.top) return e.scrollIntoView(true)
      if (bottom > pos.container.bottom) return e.scrollIntoView(false)
    },
  }, [

    ,h('div', {
      style: { display: 'flex' },
    }, [

      ,h('div', {
        style: {
          display: 'flex',
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

    ])

    ,h('span', {
      style: {
        fontWeight: 'normal',
        color: 'rgba(255, 255, 255, 0.2)',
      }
    }, getSymbolDescription(kind).toLowerCase())

  ])))

])

const ui = app({ name: 'symbols', state, actions, view })
export const show = (symbols: Symbol[], mode: SymbolMode) => ui.show({ symbols, mode })
