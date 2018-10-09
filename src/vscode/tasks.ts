import { TaskStartEvent, TaskEndEvent, TaskProcessStartEvent, TaskProcessEndEvent } from 'vscode'
import { Watcher } from '../support/utils'
import * as vsc from 'vscode'

interface Events {
  didStartTask: TaskStartEvent
  didEndTask: TaskEndEvent
  didStartTaskProcess: TaskProcessStartEvent
  didEndTaskProcess: TaskProcessEndEvent
}

const activeTasks = new Set<vsc.TaskExecution>()
const watchers = Watcher<Events>()

const tasks: typeof vsc.tasks = {
// const tasks: any = {
  // var
  get taskExecutions() { return [...activeTasks] },

  // events
  onDidStartTask: fn => ({ dispose: watchers.on('didStartTask', fn) }),
  onDidEndTask: fn => ({ dispose: watchers.on('didEndTask', fn) }),
  onDidStartTaskProcess: fn => ({ dispose: watchers.on('didStartTaskProcess', fn) }),
  onDidEndTaskProcess: fn => ({ dispose: watchers.on('didEndTaskProcess', fn) }),

  // functions
}

export default tasks
