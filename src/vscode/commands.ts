import { EventEmitter } from 'events'
import trace from '../support/trace'
import * as vsc from 'vscode'

const log = trace('vscodeapi')

const registeredCommands = new EventEmitter()

const commands: typeof vsc.commands = {
  executeCommand: (command, ...args) => {
    log('executeCommand:', command, args)
    registeredCommands.emit(command, ...args)
    return new Promise(() => {})
  },
  getCommands: async (filterInternal) => {
    log('getCommands:', filterInternal)
    const events = registeredCommands.eventNames().map(m => m.toString())
    if (filterInternal) return events.filter(e => !e.startsWith('_'))
    return events
  },
  registerCommand: (command, callback) => {
    log('registerCommand', command, callback)
    registeredCommands.on(command, callback)
    return { dispose: () => registeredCommands.removeListener(command, callback) }
  },
  registerTextEditorCommand: (command, callback) => {
    log('registerTextEditorCommand', command, callback)
    // TODO: the callback needs to return a TextEditor object. where do we get that from?
    // TODO: are we supposed to return textEditorCommands in getCommands or executeCommand?
    console.warn('NYI: registerTextEditorCommand', command, callback)
    return { dispose: () => console.warn('NYI: registerTextEditorCommand disposable') }
  },
}

export default commands
