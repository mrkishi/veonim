import { listDebuggers, DebuggerInfo } from '../core/extensions'
import { Plugin } from '../components/plugin-container'
import { RowNormal } from '../components/row-container'
import Input from '../components/text-input'
import { filter } from 'fuzzaldrin-plus'
import * as Icon from 'hyperapp-feather'
import { action } from '../core/neovim'
import * as debug from '../ai/debug'
import { h, app } from '../ui/uikit'

const state = {
  visible: false,
  value: '',
  debuggers: [] as DebuggerInfo[],
  cache: [] as DebuggerInfo[],
  index: 0,
}

type S = typeof state

const resetState = { value: '', visible: false, index: 0 }

const actions = {
  select: () => (s: S) => {
    if (!s.debuggers.length) return resetState
    const item = s.debuggers[s.index]
    if (item) debug.start(item.type)
    return resetState
  },

  change: (value: string) => (s: S) => ({ value, index: 0, debuggers: value
    ? filter(s.cache, value, { key: 'label' })
    : s.cache
  }),

  hide: () => resetState,
  show: (debuggers: DebuggerInfo[]) => ({ debuggers, cache: debuggers, visible: true }),
  next: () => (s: S) => ({ index: s.index + 1 > s.debuggers.length - 1 ? 0 : s.index + 1 }),
  prev: () => (s: S) => ({ index: s.index - 1 < 0 ? s.debuggers.length - 1 : s.index - 1 }),
}

type A = typeof actions

const view = ($: S, a: A) => Plugin($.visible, [

  ,Input({
    select: a.select,
    change: a.change,
    hide: a.hide,
    next: a.next,
    prev: a.prev,
    value: $.value,
    desc: 'choose debugger',
    focus: true,
    icon: Icon.Cpu,
  })

  ,h('div', $.debuggers.map(({ type, label }, ix) => h(RowNormal, {
    key: type,
    active: ix === $.index,
  }, [
    ,h('span', label)
  ])))

])

const ui = app<S, A>({ name: 'debug', state, actions, view })

action('debug-start', async () => ui.show(await listDebuggers()))
