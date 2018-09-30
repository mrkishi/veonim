import { NeovimAPI } from '../neovim/api'
import { EventEmitter } from 'events'

type DocumentCallback = (documentName: string) => void

export interface TextDocumentManager {
  didOpen: (fn: DocumentCallback) => void
  // TODO: better change event types/data - including ranges, etc.
  didChange: (fn: (name: string, changes: string[]) => void) => void
  willSave: (fn: DocumentCallback) => void
  didSave: (fn: DocumentCallback) => void
  didClose: (fn: DocumentCallback) => void
}

export default (nvim: NeovimAPI) => {
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
      // console.log('changeEvent', changeEvent)

      watchers.emit('didChange', name, changeEvent.lineData)
    })

    nvim.current.buffer.onDetach(() => watchers.emit('didClose', name))
  }

  nvim.on.bufAdd(async () => {
    const name = await nvim.current.buffer.name
    loadOrOpen(name)
  })

  nvim.on.bufLoad(() => loadOrOpen(nvim.state.absoluteFilepath))
  nvim.on.bufWritePre(() => watchers.emit('willSave', nvim.state.absoluteFilepath))
  nvim.on.bufWrite(() => watchers.emit('didSave', nvim.state.absoluteFilepath))

  const on: TextDocumentManager = {
    didOpen: fn => watchers.on('didOpen', fn),
    didChange: fn => watchers.on('didChange', fn),
    willSave: fn => watchers.on('willSave', fn),
    didSave: fn => watchers.on('didSave', fn),
    didClose: fn => watchers.on('didClose', fn),
  }

  return { on }
}
