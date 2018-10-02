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

interface NotifyParams {
  buffer: Buffer
  name: string
  filetype: string
  revision: number
  event: 'didOpen' | 'didChange'
}

type On<T> = (params: T) => void

const api = (nvim: NeovimAPI, onlyFiletypeBuffers?: string[]) => {
  const openDocuments = new Set<string>()
  const watchers = new EventEmitter()
  const filetypes = new Set(onlyFiletypeBuffers)
  const invalidFiletype = (ft: string) => filetypes.size && !filetypes.has(ft)

  const notify = async ({ name, filetype, revision, buffer, event }: NotifyParams) => {
    const textLines = await buffer.getAllLines()

    watchers.emit(event, {
      name,
      filetype,
      textLines,
      version: revision,
      uri: `file://${name}`,
      languageId: filetypeToLanguageID(filetype),
    } as DocChange)
  }


  nvim.on.bufOpen(async buffer => {
    const filetype = await buffer.getOption('filetype')
    if (invalidFiletype(filetype)) return

    const [ name, revision ] = await Promise.all([
      buffer.name,
      buffer.changedtick,
    ])

    if (!name) return

    notify({ event: 'didOpen',  buffer, name, filetype, revision })
  })

  nvim.on.bufLoad(() => {
    if (invalidFiletype(nvim.state.filetype)) return
    const name = nvim.state.absoluteFilepath
    if (!name) return

    return notify({
      name,
      buffer: nvim.current.buffer,
      revision: nvim.state.revision,
      filetype: nvim.state.filetype,
      event: openDocuments.has(name) ? 'didChange' : 'didOpen',
    })
  })

  nvim.on.bufWritePre(() => {
    if (invalidFiletype(nvim.state.filetype)) return
    watchers.emit('willSave', nvim.state.absoluteFilepath)
  })

  nvim.on.bufWrite(() => {
    if (invalidFiletype(nvim.state.filetype)) return
    watchers.emit('didSave', nvim.state.absoluteFilepath)
  })

  nvim.on.bufClose(async buffer => {
    const name = await buffer.name
    if (!name) return
    openDocuments.delete(name)
    watchers.emit('didClose', name)
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
