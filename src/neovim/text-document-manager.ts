import { EventEmitter } from 'events'
import nvim from '../core/neovim'

type DocumentCallback = (documentName: string) => void

export default () => {
  const openDocuments = new Set<string>()
  const watchers = new EventEmitter()

  nvim.on.bufLoad(async () => {
    const name = await nvim.current.buffer.name
    console.log('buffer loaded', name)
    const documentOpen = openDocuments.has(name)
    if (documentOpen) return
    openDocuments.add(name)
    watchers.emit('didOpen', name)
  })

  nvim.on.bufAdd(async () => {
    const name = await nvim.current.buffer.name
    console.log('buffer added', name)
  })

  const on = {
    didOpen: (fn: DocumentCallback) => watchers.on('didOpen', fn),
    didChange: (fn: (name: string, change: string[]) => void) => watchers.on('didChange', fn),
    willSave: (fn: DocumentCallback) => watchers.on('willSave', fn),
    didSave: (fn: DocumentCallback) => watchers.on('didSave', fn),
    didClose: (fn: DocumentCallback) => watchers.on('didClose', fn),
  }

  return { on }
}
