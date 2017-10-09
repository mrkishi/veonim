export default (cwd: string) => ({
  rootPath: cwd,
  rootUri: 'file://' + cwd,
  capabilities: {
    workspace: {
      applyEdit: true,
      workspaceEdit: {
        documentChanges: true
      },
      didChangeConfiguration: {
        dynamicRegistration: true
      },
      didChangeWatchedFiles: {
        dynamicRegistration: true
      },
      symbol: {
        dynamicRegistration: true
      },
      executeCommand: {
        dynamicRegistration: true
      }
    },
    textDocument: {
      synchronization: {
        dynamicRegistration: true,
        willSave: true,
        willSaveWaitUntil: true,
        didSave: true
      },
      completion: {
        dynamicRegistration: true,
        completionItem: {
          snippetSupport: true
        }
      },
      hover: {
        dynamicRegistration: true
      },
      signatureHelp: {
        dynamicRegistration: true
      },
      references: {
        dynamicRegistration: true
      },
      documentHighlight: {
        dynamicRegistration: true
      },
      documentSymbol: {
        dynamicRegistration: true
      },
      formatting: {
        dynamicRegistration: true
      },
      rangeFormatting: {
        dynamicRegistration: true
      },
      onTypeFormatting: {
        dynamicRegistration: true
      },
      definition: {
        dynamicRegistration: true
      },
      codeAction: {
        dynamicRegistration: true
      },
      codeLens: {
        dynamicRegistration: true
      },
      documentLink: {
        dynamicRegistration: true
      },
      rename: {
        dynamicRegistration: true
      }
    }
  }
})
