import { Plugin } from '../components/plugin-container'
import { RowNormal } from '../components/row-container'
import { action, call } from '../core/neovim'
import Input from '../components/text-input'
import { filter } from 'fuzzaldrin-plus'
import { User } from 'hyperapp-feather'
import { h, app } from '../ui/uikit'

const state = {
  id: 0,
  visible: false,
  value: '',
  items: [] as string[],
  cache: [] as string[],
  desc: '',
  index: 0,
}

type S = typeof state

const resetState = { value: '', visible: false, index: 0 }

const actions = {
  select: () => (s: S) => {
    if (!s.items.length) return resetState
    const item = s.items[s.index]
    if (item) call.VeonimCallback(s.id, item)
    return resetState
  },

  // TODO: not hardcoded 14
  change: (value: string) => (s: S) => ({ value, items: value
    ? filter(s.cache, value).slice(0, 14)
    : s.cache.slice(0, 14)
  }),

  hide: () => resetState,
  show: ({ id, items, desc }: any) => ({ id, desc, items, cache: items, visible: true }),
  next: () => (s: S) => ({ index: s.index + 1 > Math.min(s.items.length - 1, 13) ? 0 : s.index + 1 }),
  prev: () => (s: S) => ({ index: s.index - 1 < 0 ? Math.min(s.items.length - 1, 13) : s.index - 1 }),
}

const view = ($: S, a: typeof actions) => Plugin($.visible, [

  ,Input({
    select: a.select,
    change: a.change,
    hide: a.hide,
    next: a.next,
    prev: a.prev,
    value: $.value,
    desc: $.desc,
    focus: true,
    icon: User,
  })

  ,h('div', $.items.map((item, ix) => h(RowNormal, {
    key: item,
    active: ix === $.index,
  }, [
    ,h('span', item)
  ])))

])

const ui = app({ name: 'user-menu', state, actions, view })

action('user-menu', (id: number, desc: string, items = []) => items.length && ui.show({ id, items, desc }))
