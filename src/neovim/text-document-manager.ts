import { EventEmitter } from 'events'
import nvim from '../core/neovim'

type DocumentCallback = (documentName: string) => void

export default () => {
  const openDocuments = new Set<string>()
  const watchers = new EventEmitter()

  nvim.on.bufLoad(async () => {
    const name = await nvim.current.buffer.name
    const documentOpen = openDocuments.has(name)
    if (!documentOpen) openDocuments.add(name)
  })

  const on = {
    didOpen: (fn: DocumentCallback) => watchers.on('didOpen', fn)
  }

  return { on }
}
