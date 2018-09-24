import { EventEmitter } from 'events'
import * as vsc from 'vscode'

const registeredCommands = new EventEmitter()

const commands: typeof vsc.commands = {
  executeCommand: (command: string, ...args: any[]) => {
    registeredCommands.emit(command, ...args)
    return new Promise(() => {})
  },
  getCommands: async (filterInternal?: boolean) => {
    const events = registeredCommands.eventNames().map(m => m.toString())
    if (filterInternal) return events.filter(e => !e.startsWith('_'))
    return events
  },
  registerCommand: (command: string, callback: (...args: any[]) => void) => {
    registeredCommands.on(command, callback)
    return { dispose: () => registeredCommands.removeListener(command, callback) }
  },
  registerTextEditorCommand: (command: string, callback: Function) => {
    // TODO: the callback needs to return a TextEditor object. where do we get that from?
    // TODO: are we supposed to return textEditorCommands in getCommands or executeCommand?
    console.warn('NYI: registerTextEditorCommand', command, callback)
    return { dispose: () => console.warn('NYI: registerTextEditorCommand disposable') }
  },
}

export default commands
