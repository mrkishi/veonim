import { h, app, Actions, ActionCaller } from '../ui/uikit'
import { Plugin, Row } from '../styles/common'
import { Task, CreateTask } from '../support/utils'
import Input from '../components/text-input'
import { filter } from 'fuzzaldrin-plus'

interface Props {
  description: string,
  options: string[],
  icon?: string,
}

interface State {
  visible: boolean,
  value: string,
  description: string,
  options: string[],
  cache: string[],
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

  ,h('div', $.options.map((item, key) => Row.normal({ key, activeWhen: key === $.ix }, item)))

])

const a: Actions<State> = {}

a.select = (s, a) => {
  if (!s.options.length) return a.hide()
  const item = s.options[s.ix]
  if (item && s.task) s.task.done(item)
  a.hide()
}

// TODO: not hardcoded 14
a.change = (s, _a, val: string) => ({ val, items: val
  ? filter(s.cache, val).slice(0, 14)
  : s.cache.slice(0, 14)
})

a.show = (_s, _a, { options, description, icon }) => ({
  description,
  options,
  icon,
  cache: options,
  vis: true
})

a.hide = () => ({ val: '', vis: false, ix: 0 })
a.next = s => ({ ix: s.ix + 1 > Math.min(s.options.length - 1, 13) ? 0 : s.ix + 1 })
a.prev = s => ({ ix: s.ix - 1 < 0 ? Math.min(s.options.length - 1, 13) : s.ix - 1 })

const ui = app({ state, view, actions: a })

export default <T>(props: Props) => {
  const task = CreateTask<T>()
  ui.show({ ...props, task })
  return task.promise
}
