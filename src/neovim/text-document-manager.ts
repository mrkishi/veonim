import filetypeToLanguageID from '../langserv/vsc-languages'
import { BufferChangeEvent, Buffer } from '../neovim/types'
import { Range } from 'vscode-languageserver-protocol'
import { NeovimAPI } from '../neovim/api'
import { EventEmitter } from 'events'

interface Doc {
  uri: string
  name: string
}

interface DocInfo extends Doc {
  languageId: string
  filetype: string
  version: number
}

interface DidOpen extends DocInfo {
  textLines: string[]
}

interface TextChange {
  range: Range,
  textLines: string[],
}

interface DidChange extends DocInfo {
  textChanges: TextChange
}

type On<T> = (params: T) => void

const api = (nvim: NeovimAPI, onlyFiletypeBuffers?: string[]) => {
  const openDocuments = new Set<string>()
  const watchers = new EventEmitter()
  const filetypes = new Set(onlyFiletypeBuffers)
  const invalidFiletype = (ft: string) => filetypes.size && !filetypes.has(ft)

  const subscribeToBufferChanges = (buffer: Buffer, name: string) => {
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
      const range = {
        start: { line: firstLine, character: 0 },
        end: { line: lastLine, character: 0 },
      }

      const textChanges: TextChange = { textLines: lineData, range }

      watchers.emit('didChange', {
        name,
        filetype,
        version: changedTick,
        uri: `file://${name}`,
        languageId: filetypeToLanguageID(filetype),
        textChanges,
      } as DidChange)
    }

    buffer.attach({ sendInitialBuffer: true }, changeEvent => {
      // TODO: handle changeEvent.more (partial change event)
      // what do? buffer in memory? can we send partial change events to
      // language servers and extensions?
      if (!sentOpenNotification) return notifyOpen(changeEvent)
      notifyChange(changeEvent)
    })

    nvim.current.buffer.onDetach(() => {
      openDocuments.delete(name)
      watchers.emit('didClose', {
        name,
        uri: `file://${name}`,
      } as Doc)
    })
  }

  const openBuffer = async (buffer: Buffer) => {
    const filetype = await buffer.getOption('filetype')
    if (invalidFiletype(filetype)) return
    const name = await buffer.name
    subscribeToBufferChanges(buffer, name)
  }

  nvim.on.bufOpen(openBuffer)

  nvim.on.bufLoad(() => {
    if (invalidFiletype(nvim.state.filetype)) return
    subscribeToBufferChanges(nvim.current.buffer, nvim.state.absoluteFilepath)
  })

  nvim.on.bufWritePre(() => {
    if (invalidFiletype(nvim.state.filetype)) return
    watchers.emit('willSave', {
      name: nvim.state.absoluteFilepath,
      uri: `file://${nvim.state.absoluteFilepath}`,
    } as Doc)
  })

  nvim.on.bufWrite(() => {
    if (invalidFiletype(nvim.state.filetype)) return
    watchers.emit('didSave', {
      name: nvim.state.absoluteFilepath,
      uri: `file://${nvim.state.absoluteFilepath}`,
    } as Doc)
  })

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

  return { on, dispose, manualBindBuffer: openBuffer }
}

export default api
export type TextDocumentManager = ReturnType<typeof api>
