import { codeAction, onDiagnostics, executeCommand } from '../langserv/adapter'
import { on, action, getCurrent, current as vim } from '../core/neovim'
import { Command, Diagnostic } from 'vscode-languageserver-types'
import { positionWithinRange } from '../support/neovim-utils'
import * as problemInfoUI from '../components/problem-info'
import * as codeActionUI from '../components/code-actions'
import { merge, uriToPath } from '../support/utils'
import { setCursorColor } from '../core/cursor'

const cache = {
  uri: '',
  diagnostics: [] as Diagnostic[],
  actions: [] as Command[],
  visibleProblems: new Map<string, () => void>(),
}

onDiagnostics(async m => {
  const path = uriToPath(m.uri)
  merge(cache, m)

  const clearPreviousConcerns = cache.visibleProblems.get(path)
  if (clearPreviousConcerns) clearPreviousConcerns()
  if (!m.diagnostics.length) return

  // TODO: handle severity (errors vs warnings, etc.)
  const concerns = m.diagnostics.map((d: Diagnostic) => ({
    line: d.range.start.line,
    columnStart: d.range.start.character,
    columnEnd: d.range.end.character,
  }))

  const buffer = await getCurrent.buffer
  const name = await buffer.name

  if (name !== path) return

  const clearToken = await buffer.highlightProblems(concerns)
  cache.visibleProblems.set(name, clearToken)
})

action('show-problem', async () => {
  const { line, column } = vim

  const targetProblem = cache.diagnostics.find(d => positionWithinRange(line - 1, column - 1, d.range))

  targetProblem && problemInfoUI.show({
    row: line,
    col: column,
    data: targetProblem.message
  })
})

on.cursorMove(() => problemInfoUI.hide())
on.insertEnter(() => problemInfoUI.hide())
on.insertLeave(() => problemInfoUI.hide())

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

action('code-action', () => codeActionUI.show(vim.line, vim.column, cache.actions))
