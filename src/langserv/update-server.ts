import { ProtocolConnection, DidOpenTextDocumentParams, DidChangeTextDocumentParams, WillSaveTextDocumentParams, DidSaveTextDocumentParams, DidCloseTextDocumentParams } from 'vscode-languageserver-protocol'
import TextDocumentManager from '../neovim/text-document-manager'
import nvim from '../vscode/neovim'

export default (server: ProtocolConnection): void => {
  const tdm = TextDocumentManager(nvim)

  // TODO: need a way to dispose of the TDM when the langserv is disposed of
  // TODO: how to handle servers that do not accept incremental updates?
  // buffer whole file in memory and apply patches on our end? or query
  // from filesystem and apply changes?

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
  })

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
  })

  tdm.on.willSave(({ uri }) => {
    const params: WillSaveTextDocumentParams = {
      reason: 1,
      textDocument: { uri },
    }

    server.sendNotification('textDocument/willSave', params)
  })

  tdm.on.didSave(({ uri, version }) => {
    const params: DidSaveTextDocumentParams = {
      textDocument: {
        uri,
        version,
      },
    }

    server.sendNotification('textDocument/didSave', params)
  })

  tdm.on.didClose(({ uri }) => {
    const params: DidCloseTextDocumentParams = {

    }

    server.sendNotification('textDocument/didClose', params)
  })
}
