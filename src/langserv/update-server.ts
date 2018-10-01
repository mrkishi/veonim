import { ProtocolConnection, DidOpenTextDocumentParams, DidChangeTextDocumentParams, WillSaveTextDocumentParams, DidSaveTextDocumentParams, DidCloseTextDocumentParams } from 'vscode-languageserver-protocol'
import TextDocumentManager from '../neovim/text-document-manager'
import nvim from '../vscode/neovim'

export default (server: ProtocolConnection) => {
  const tdm = TextDocumentManager(nvim)

  // TODO: need to send didOpen on the current buffer after server has started...
  // (because didOpen was called long ago before the server started - to start
  // the server actually)
  //
  // we could probably wait and listen for 'initalize' response?
  // that's a request, so i think we would need to have the main thread notify... shit...
  // or we could move the server start and buffer things at the extension-host layer...

  tdm.on.didOpen(({ uri, version, languageId, textLines }) => {
    const params: DidOpenTextDocumentParams = {
      textDocument: {
        uri,
        version,
        languageId,
        text: textLines.join('\n'),
      },
    }

    server.sendNotification('textDocument/didOpen', params)
    console.debug('NOTIFY --> textDocument/didOpen', params)
  })

  // TODO: how to handle servers that do not accept incremental updates?
  // buffer whole file in memory and apply patches on our end? or query
  // from filesystem and apply changes?
  tdm.on.didChange(({ uri, version, textChanges }) => {
    const params: DidChangeTextDocumentParams = {
      textDocument: {
        uri,
        version,
      },
      contentChanges: [{
        text: textChanges.textLines.join('\n'),
        range: textChanges.range,
      }],
    }

    server.sendNotification('textDocument/didChange', params)
    console.debug('NOTIFY --> textDocument/didChange', params)
  })

  tdm.on.willSave(({ uri }) => {
    const params: WillSaveTextDocumentParams = {
      reason: 1,
      textDocument: { uri },
    }

    server.sendNotification('textDocument/willSave', params)
    console.debug('NOTIFY --> textDocument/willSave', params)
  })

  tdm.on.didSave(({ uri, version }) => {
    const params: DidSaveTextDocumentParams = {
      textDocument: {
        uri,
        version,
      },
    }

    server.sendNotification('textDocument/didSave', params)
    console.debug('NOTIFY --> textDocument/didSave', params)
  })

  tdm.on.didClose(({ uri }) => {
    const params: DidCloseTextDocumentParams = {
      textDocument: { uri },
    }

    server.sendNotification('textDocument/didClose', params)
    console.debug('NOTIFY --> textDocument/didClose', params)
  })

  return { dispose: () => tdm.dispose() }
}
