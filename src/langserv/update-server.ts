import { ProtocolConnection, DidOpenTextDocumentParams, DidChangeTextDocumentParams, WillSaveTextDocumentParams, DidSaveTextDocumentParams, DidCloseTextDocumentParams, TextDocumentSyncKind } from 'vscode-languageserver-protocol'
import { vscLanguageToFiletypes } from '../langserv/vsc-languages'
import TextDocumentManager from '../neovim/text-document-manager'
import { traceLANGSERV as log } from '../support/trace'
import nvim from '../vscode/neovim'

interface LanguageServer extends ProtocolConnection {
  textSyncKind: TextDocumentSyncKind
  untilInitialized: Promise<void>
  pauseTextSync: boolean
}

const incrementalUpdater = (server: LanguageServer, languageId: string) => {
  const limitedFiletypes = vscLanguageToFiletypes(languageId)
  const tdm = TextDocumentManager(nvim, limitedFiletypes)
  let initialized = false
  let buffer: any[] = []

  server.untilInitialized.then(() => {
    buffer.forEach(([ method, params ]) => {
      server.sendNotification(`textDocument/${method}`, params)
      log(`NOTIFY --> textDocument/${method}`, params)
    })
    buffer = []
    initialized = true
  })

  const send = (method: string, params: any) => {
    if (!initialized) return buffer.push([ method, params ])
    server.sendNotification(`textDocument/${method}`, params)
    log(`NOTIFY --> textDocument/${method}`, params)
  }

  tdm.on.didOpen(({ uri, version, languageId, textLines }) => send('didOpen', {
    textDocument: {
      uri,
      version,
      languageId,
      text: textLines.join('\n'),
    },
  } as DidOpenTextDocumentParams))

  // TODO: how to handle servers that do not accept incremental updates?
  // buffer whole file in memory and apply patches on our end? or query
  // from filesystem and apply changes?
  tdm.on.didChange(({ uri, version, textChanges }) => !server.pauseTextSync && send('didChange', {
    textDocument: {
      uri,
      version,
    },
    contentChanges: [{
      text: textChanges.textLines.join('\n'),
      range: textChanges.range,
    }],
  } as DidChangeTextDocumentParams))

  tdm.on.willSave(({ uri }) => send('willSave', {
    reason: 1,
    textDocument: { uri },
  } as WillSaveTextDocumentParams))

  tdm.on.didSave(({ uri, version }) => send('didSave', {
    textDocument: {
      uri,
      version,
    },
  } as DidSaveTextDocumentParams))

  tdm.on.didClose(({ uri }) => send('didClose', {
    textDocument: { uri },
  } as DidCloseTextDocumentParams))

  return { dispose: () => tdm.dispose() }
}

const fullUpdater = (server: LanguageServer, languageId: string) => {
  console.warn(`Warning: Language server for ${languageId} does not support incremental text synchronization. This means a negative performance impact - especially on large buffers`)

  // TODO: do the needful
  // should we just bundle this functionality with TDM?
  return { dispose: () => {} }
}

const noneUpdater = (languageId: string) => {
  console.warn(`Warning: Language server for ${languageId} does not support any kind of text synchronization. This seems strange to me, but hey, maybe it works anyways.`)
  return { dispose: () => {} }
}

export default (server: LanguageServer, languageId: string) => {
  if (server.textSyncKind === TextDocumentSyncKind.Incremental) return  incrementalUpdater(server, languageId)
  if (server.textSyncKind === TextDocumentSyncKind.Full) return fullUpdater(server, languageId)
  return noneUpdater(languageId)
}
