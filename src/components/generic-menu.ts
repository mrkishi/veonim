import { Plugin } from '../components/plugin-container'
import { RowNormal } from '../components/row-container'
import { CreateTask } from '../support/utils'
import Input from '../components/text-input2'
import { filter } from 'fuzzaldrin-plus'
import { h, app } from '../ui/uikit2'

export interface MenuOption {
  key: any,
  value: string,
}

interface Props {
  description: string,
  options: MenuOption[],
  icon?: string,
}

const state = {
  visible: false,
  value: '',
  options: [] as MenuOption[],
  cache: [] as MenuOption[],
  description: '',
  ix: 0,
  icon: 'user',
  task: CreateTask(),
}

type S = typeof state

const resetState = { value: '', visible: false, ix: 0 }

const actions = {
  select: (s: S) => {
    if (!s.options.length) return resetState
    s.task.done((s.options[s.ix] || {}).key)
    return resetState
  },

  // TODO: not hardcoded 14
  change: (s: S, value: string) => ({ value, options: value
    ? filter(s.cache, value, { key: 'value' }).slice(0, 14)
    : s.cache.slice(0, 14)
  }),

  show: (_s: S, { options, description, icon, task }: any) => ({
    description,
    options,
    task,
    icon,
    cache: options,
    visible: true
  }),

  hide: () => resetState,
  next: (s: S) => ({ ix: s.ix + 1 > Math.min(s.options.length - 1, 13) ? 0 : s.ix + 1 }),
  prev: (s: S) => ({ ix: s.ix - 1 < 0 ? Math.min(s.options.length - 1, 13) : s.ix - 1 }),
}

const ui = app({ name: 'generic-menu', state, actions, view: ($, a) => Plugin($.visible, [

  ,Input({
    select: a.select,
    change: a.change,
    hide: a.hide,
    next: a.next,
    prev: a.prev,
    value: $.value,
    desc: $.description,
    focus: true,
    icon: $.icon,
  })

  ,h('div', $.options.map(({ key, value }, id) => h(RowNormal, {
    key,
    active: id === $.ix
  }, [
    ,h('span', value)
  ])))

]) })

export default <T>(props: Props) => {
  const task = CreateTask<T>()
  ui.show({ ...props, task })
  return task.promise
}
