import { h, app, Actions, ActionCaller } from '../ui/uikit'
import { Plugin, Row } from '../styles/common'
import { Task, CreateTask } from '../support/utils'
import Input from '../components/text-input'
import { filter } from 'fuzzaldrin-plus'

export interface MenuOption {
  key: any,
  value: string,
}

interface Props {
  description: string,
  options: MenuOption[],
  icon?: string,
}

interface State {
  visible: boolean,
  value: string,
  description: string,
  options: MenuOption[],
  cache: MenuOption[],
  ix: number,
  icon: string,
  task?: Task<any>,
}

const state: State = {
  visible: false,
  value: '',
  options: [],
  cache: [],
  description: '',
  ix: 0,
  icon: 'user',
}

const view = ($: State, actions: ActionCaller) => Plugin.default('user-menu', $.visible, [
  ,Input({
    ...actions,
    val: $.value,
    desc: $.description,
    focus: true,
    icon: $.icon,
  })

  ,h('div', $.options.map(({ key, value }, id) => Row.normal({
    key,
    activeWhen: id === $.ix
  }, value)))

])

const a: Actions<State> = {}

a.select = (s, a) => {
  if (!s.options.length) return a.hide()
  s.task && s.task.done((s.options[s.ix] || {}).key)
  a.hide()
}

// TODO: not hardcoded 14
a.change = (s, _a, value: string) => ({ value, options: value
  ? filter(s.cache, value, { key: 'value' }).slice(0, 14)
  : s.cache.slice(0, 14)
})

a.show = (_s, _a, { options, description, icon, task }) => ({
  description,
  options,
  task,
  icon,
  cache: options,
  visible: true
})

a.hide = () => ({ value: '', visible: false, ix: 0 })
a.next = s => ({ ix: s.ix + 1 > Math.min(s.options.length - 1, 13) ? 0 : s.ix + 1 })
a.prev = s => ({ ix: s.ix - 1 < 0 ? Math.min(s.options.length - 1, 13) : s.ix - 1 })

const ui = app({ state, view, actions: a })

export default <T>(props: Props) => {
  const task = CreateTask<T>()
  ui.show({ ...props, task })
  return task.promise
}
