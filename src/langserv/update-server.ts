import { ProtocolConnection, DidOpenTextDocumentParams, DidChangeTextDocumentParams, WillSaveTextDocumentParams, DidSaveTextDocumentParams, DidCloseTextDocumentParams } from 'vscode-languageserver-protocol'
import TextDocumentManager from '../neovim/text-document-manager'
import { traceLANGSERV as log } from '../support/trace'
import nvim from '../vscode/neovim'

interface LanguageServer extends ProtocolConnection {
  untilInitialized: Promise<void>
  pauseTextSync: boolean
}

export default (server: LanguageServer) => {
  const tdm = TextDocumentManager(nvim)
  let initialized = false
  let buffer: any[] = []

  server.untilInitialized.then(() => {
    buffer.forEach(([ method, params ]) => {
      server.sendNotification(method, params)
      log(`NOTIFY --> textDocument/${method}`, params)
    })
    buffer = []
    initialized = true
  })

  const send = (method: string, params: any) => {
    if (!initialized) return buffer.push([ method, params ])
    console.log('textSyncState:', server.pauseTextSync)
    server.sendNotification(method, params)
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
  tdm.on.didChange(({ uri, version, textChanges }) => send('didChange', {
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
