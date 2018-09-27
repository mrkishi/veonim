import { EventEmitter } from 'events'
import nvim from '../core/neovim'

type DocumentCallback = (documentName: string) => void

export default () => {
  const openDocuments = new Set<string>()
  const watchers = new EventEmitter()

  const loadOrOpen = (name: string) => {
    if (!name || openDocuments.has(name)) return

    openDocuments.add(name)
    watchers.emit('didOpen', name)

    nvim.current.buffer.attach({ sendInitialBuffer: true }, changeEvent => {
      // TODO: handle changeEvent.more (partial change event)
      // what do? buffer in memory? can we send partial change events to
      // language servers and extensions?
      console.log('changeEvent', changeEvent)

      watchers.emit('didChange', name, changeEvent.lineData)
    })
  }

  nvim.on.bufAdd(async () => {
    const name = await nvim.current.buffer.name
    loadOrOpen(name)
  })

  nvim.on.bufLoad(() => loadOrOpen(nvim.state.absoluteFilepath))
  nvim.on.bufWritePre(() => watchers.emit('willSave', nvim.state.absoluteFilepath))
  nvim.on.bufWrite(() => watchers.emit('didSave', nvim.state.absoluteFilepath))
  nvim.on.bufUnload(() => watchers.emit('didClose', nvim.state.absoluteFilepath))

  const on = {
    didOpen: (fn: DocumentCallback) => watchers.on('didOpen', fn),
    // TODO: better change event types/data - including ranges, etc.
    didChange: (fn: (name: string, changes: string[]) => void) => watchers.on('didChange', fn),
    willSave: (fn: DocumentCallback) => watchers.on('willSave', fn),
    didSave: (fn: DocumentCallback) => watchers.on('didSave', fn),
    didClose: (fn: DocumentCallback) => watchers.on('didClose', fn),
  }

  return { on }
}
