import { Plugin } from '../components/plugin-container'
import { CreateTask, Task } from '../support/utils'
import Input from '../components/text-input'
import * as Icon from 'hyperapp-feather'
import { app } from '../ui/uikit'

const state = {
  value: '',
  desc: '',
  visible: false,
  task: CreateTask(),
}

type S = typeof state

const resetState = { value: '', visible: false, desc: '' } 

const actions = {
  show: ({ desc, task }: any) => ({
    desc,
    task,
    value: '',
    visible: true,
  }),
  hide: () => resetState,
  change: (value: string) => ({ value }),
  select: () => (s: S) => {
    s.value && s.task.done(s.value)
    return resetState
  },
}

type A = typeof actions

const view = ($: S, a: A) => Plugin($.visible, [

  ,Input({
    focus: true,
    icon: Icon.HelpCircle,
    hide: a.hide,
    select: a.select,
    change: a.change,
    value: $.value,
    desc: $.desc,
  })

])

const ui = app<S, A>({ name: 'generic-prompt', state, actions, view })

export default (question: string) => {
  const task = CreateTask<string>()
  ui.show({ task, desc: question })
  return task.promise
}
