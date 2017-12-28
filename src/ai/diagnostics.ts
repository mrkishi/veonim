import { codeAction, onDiagnostics, executeCommand } from '../langserv/adapter'
import { Command, Diagnostic } from 'vscode-languageserver-types'
import { positionWithinRange } from '../support/neovim-utils'
import { on, action, current as vim } from '../core/neovim'
import * as codeActionUI from '../components/code-actions'
import { setCursorColor } from '../core/cursor'
import { merge } from '../support/utils'

const cache = {
  uri: '',
  diagnostics: [] as Diagnostic[],
  actions: [] as Command[],
}

onDiagnostics(m => {
  console.log('PROBLEMS FOR:', m.uri, m.diagnostics)
  merge(cache, m)
})

on.cursorMove(async state => {
  const { line, column } = state

  const relevantDiagnostics = cache
    .diagnostics
    .filter(d => positionWithinRange(line - 1, column - 1, d.range))

  const actions = await codeAction(state, relevantDiagnostics)

  // TODO: what is the stuff on the columnbar? code lens?
  if (actions && actions.length) {
    cache.actions = actions
    setCursorColor('red')
  }
})

export const runCodeAction = (action: Command) => executeCommand(vim, action)

action('quickfix', () => codeActionUI.show(vim.line, vim.column, cache.actions))
