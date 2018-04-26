import { RowNormal } from '../components/row-container'
import { Command } from 'vscode-languageserver-types'
import { runCodeAction } from '../ai/diagnostics'
import { activeWindow } from '../core/windows'
import Input from '../components/text-input'
import Overlay from '../components/overlay'
import { filter } from 'fuzzaldrin-plus'
import { h, app } from '../ui/uikit'

const state = {
  x: 0,
  y: 0,
  value: '',
  visible: false,
  actions: [] as Command[],
  cache: [] as Command[],
  index: 0,
}

type S = typeof state

const resetState = { value: '', visible: false } 

const actions = {
  show: ({ x, y, actions }: any) => ({ x, y, actions, cache: actions, visible: true }),
  hide: () => resetState,

  change: (value: string) => (s: S) => ({ value, actions: value
    ? filter(s.actions, value, { key: 'title' })
    : s.cache
  }),

  select: () =>  (s: S) => {
    if (!s.actions.length) return resetState
    const action = s.actions[s.index]
    if (action) runCodeAction(action)
    return resetState
  },

  next: () => (s: S) => ({ index: s.index + 1 > s.actions.length - 1 ? 0 : s.index + 1 }),
  prev: () => (s: S) => ({ index: s.index - 1 < 0 ? s.actions.length - 1 : s.index - 1 }),
}

const view = ($: S, a: typeof actions) => Overlay({
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
      hide: a.hide,
      next: a.next,
      prev: a.prev,
      change: a.change,
      select: a.select,
      value: $.value,
      focus: true,
      small: true,
      icon: 'code',
      desc: 'run code action',
    })

    ,h('div', $.actions.map((s, ix) => h(RowNormal, {
      key: `${s.title}-${s.command}`,
      active: ix === $.index,
    }, [
      ,h('span', s.title)
    ])))

  ])

])

const ui = app({ name: 'code-actions', state, actions, view })

export const show = (row: number, col: number, actions: Command[]) => {
  if (!actions.length) return
  const x = activeWindow() ? activeWindow()!.colToX(col) : 0
  const y = activeWindow() ? activeWindow()!.rowToTransformY(row + 1) : 0
  ui.show({ x, y, actions })
}
