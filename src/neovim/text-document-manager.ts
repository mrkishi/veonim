import filetypeToLanguageID from '../langserv/vsc-languages'
import { Range } from 'vscode-languageserver-protocol'
import { BufferChangeEvent } from '../neovim/types'
import { NeovimAPI } from '../neovim/api'
import { EventEmitter } from 'events'

interface Doc {
  name: string
  uri: string
  languageId: string
  filetype: string
  version: number
}

interface DidOpen extends Doc {
  textLines: string[]
}

interface TextChange {
  range: Range,
  textLines: string[],
}

interface DidChange extends Doc {
  textChanges: TextChange
}

type On<T> = (params: T) => void

const api = (nvim: NeovimAPI) => {
  const openDocuments = new Set<string>()
  const watchers = new EventEmitter()

  const loadOrOpen = (name: string) => {
    if (!name || openDocuments.has(name)) return
    let sentOpenNotification = false

    openDocuments.add(name)

    const notifyOpen = ({ filetype, lineData, changedTick }: BufferChangeEvent) => {
      sentOpenNotification = true
      watchers.emit('didOpen', {
        name,
        filetype,
        version: changedTick,
        uri: `file://${name}`,
        languageId: filetypeToLanguageID(filetype),
        textLines: lineData
      } as DidOpen)
    }

    const notifyChange = ({ filetype, lineData, changedTick, firstLine, lastLine }: BufferChangeEvent) => {
      const textChanges: TextChange = {
        textLines: lineData,
        range: {
          start: { line: firstLine, character: 0 },
          end: { line: lastLine, character: firstLine === lastLine ? lineData[0].length : 0 }
        }
      }

      watchers.emit('didChange', {
        name,
        filetype,
        version: changedTick,
        uri: `file://${name}`,
        languageId: filetypeToLanguageID(filetype),
        textChanges,
      } as DidChange)
    }

    nvim.current.buffer.attach({ sendInitialBuffer: true }, changeEvent => {
      // TODO: handle changeEvent.more (partial change event)
      // what do? buffer in memory? can we send partial change events to
      // language servers and extensions?
      if (!sentOpenNotification) return notifyOpen(changeEvent)
      notifyChange(changeEvent)
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

  const on = {
    didOpen: (fn: On<DidOpen>) => watchers.on('didOpen', fn),
    didChange: (fn: On<DidChange>) => watchers.on('didChange', fn),
    willSave: (fn: On<Doc>) => watchers.on('willSave', fn),
    didSave: (fn: On<Doc>) => watchers.on('didSave', fn),
    didClose: (fn: On<Doc>) => watchers.on('didClose', fn),
  }

  // TODO: please dispose TextDocumentManager
  // detach from buffers and cleanup
  const dispose = () => {
    console.warn('NYI: dipose TextDocumentManager')
  }

  return { on, dispose }
}

export default api
export type TextDocumentManager = ReturnType<typeof api>
