import { Watcher } from '../support/utils'
import * as vsc from 'vscode'

const activeTasks = new Set<vsc.TaskExecution>()
const watchers = Watcher()

const tasks: typeof vsc.tasks = {
// const tasks: any = {
  // var
  get taskExecutions() { return [...activeTasks] },

  // events
  onDidEndTask: fn => watchers.on('didEnd', fn),

  // functions
}

export default tasks
