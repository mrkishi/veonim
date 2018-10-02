import filetypeToLanguageID from '../langserv/vsc-languages'
import { Buffer } from '../neovim/types'
import { NeovimAPI } from '../neovim/api'
import { EventEmitter } from 'events'

interface Doc {
  name: string
  uri: string
  languageId: string
  filetype: string
  version: number
}

interface DocChange extends Doc {
  textLines: string[]
}

type On<T> = (params: T) => void

const api = (nvim: NeovimAPI, onlyFiletypeBuffers?: string[]) => {
  const openDocuments = new Set<string>()
  const watchers = new EventEmitter()
  const filetypes = new Set(onlyFiletypeBuffers)
  const invalidFiletype = (ft: string) => filetypes.size && !filetypes.has(ft)

  const notifyOpen = (buffer: Buffer, name: string) => {

    watchers.emit('didOpen', {
      name,
      filetype,
      version: changedTick,
      uri: `file://${name}`,
      languageId: filetypeToLanguageID(filetype),
      textLines: lineData
    } as DidOpen)
  }

  const notifyChange = (buffer: Buffer, name: string) => {

  }

  nvim.on.bufAdd(async buffer => {
    const filetype = await buffer.getOption('filetype')
    if (invalidFiletype(filetype)) return
    const name = await buffer.name
    if (!name) return
    notifyOpen(buffer, name)
  })

  nvim.on.bufLoad(() => {
    if (invalidFiletype(nvim.state.filetype)) return
    const name = nvim.state.absoluteFilepath
    if (!name) return
    if (!openDocuments.has(name)) return notifyOpen(nvim.current.buffer, name)
    return notifyChange(nvim.current.buffer, name)
  })

  nvim.on.bufWritePre(() => {
    if (invalidFiletype(nvim.state.filetype)) return
    watchers.emit('willSave', nvim.state.absoluteFilepath)
  })
  nvim.on.bufWrite(() => {
    if (invalidFiletype(nvim.state.filetype)) return
    watchers.emit('didSave', nvim.state.absoluteFilepath)
  })

  const on = {
    didOpen: (fn: On<DocChange>) => watchers.on('didOpen', fn),
    didChange: (fn: On<DocChange>) => watchers.on('didChange', fn),
    willSave: (fn: On<Doc>) => watchers.on('willSave', fn),
    didSave: (fn: On<Doc>) => watchers.on('didSave', fn),
    didClose: (fn: On<Doc>) => watchers.on('didClose', fn),
  }

  // TODO: please dispose
  // detach from buffers and cleanup
  const dispose = () => {
    console.warn('NYI: dipose FullDocumentManager')
  }

  return { on, dispose }
}

export default api
export type FullDocumentManager = ReturnType<typeof api>
