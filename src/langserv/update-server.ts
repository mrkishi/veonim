import { ProtocolConnection, DidOpenTextDocumentParams, DidChangeTextDocumentParams, WillSaveTextDocumentParams, DidSaveTextDocumentParams, DidCloseTextDocumentParams, TextDocumentSyncKind } from 'vscode-languageserver-protocol'
import { vscLanguageToFiletypes } from '../langserv/vsc-languages'
import TextDocumentManager from '../neovim/text-document-manager'
import FullDocumentManager from '../neovim/full-document-manager'
import { traceLANGSERV as log } from '../support/trace'
import nvim from '../vscode/neovim'

interface LanguageServer extends ProtocolConnection {
  textSyncKind: TextDocumentSyncKind
  untilInitialized: Promise<void>
  pauseTextSync: boolean
}

const updater = (server: LanguageServer, languageId: string, incremental = true) => {
  const limitedFiletypes = vscLanguageToFiletypes(languageId)
  let initialized = false
  let buffer: any[] = []
  const { on, dispose } = incremental
    ? TextDocumentManager(nvim, limitedFiletypes)
    : FullDocumentManager(nvim, limitedFiletypes)

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

  on.didOpen(({ uri, version, languageId, textLines }) => send('didOpen', {
    textDocument: {
      uri,
      version,
      languageId,
      text: textLines.join('\n'),
    },
  } as DidOpenTextDocumentParams))

  on.didChange(({ uri, version, textChanges }) => !server.pauseTextSync && send('didChange', {
    textDocument: {
      uri,
      version,
    },
    contentChanges: [{
      text: textChanges.textLines.join('\n'),
      range: textChanges.range,
    }],
  } as DidChangeTextDocumentParams))

  on.willSave(({ uri }) => send('willSave', {
    reason: 1,
    textDocument: { uri },
  } as WillSaveTextDocumentParams))

  on.didSave(({ uri, version }) => send('didSave', {
    textDocument: {
      uri,
      version,
    },
  } as DidSaveTextDocumentParams))

  on.didClose(({ uri }) => send('didClose', {
    textDocument: { uri },
  } as DidCloseTextDocumentParams))

  return { dispose }
}

export default (server: LanguageServer, languageId: string) => {
  if (server.textSyncKind === TextDocumentSyncKind.Incremental) {
    return updater(server, languageId, true)
  }

  if (server.textSyncKind === TextDocumentSyncKind.Full) {
    console.warn(`Warning: Language server for ${languageId} does not support any kind of text synchronization. This seems strange to me, but hey, maybe it works anyways.`)
    return updater(server, languageId, false)
  }

  return { dispose: () => {} }
}
