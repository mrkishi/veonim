import { Command, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver-types'
import { codeAction, onDiagnostics, executeCommand } from '../langserv/adapter'
import { on, action, getCurrent, current as vim } from '../core/neovim'
import { positionWithinRange } from '../support/neovim-utils'
import * as problemInfoUI from '../components/problem-info'
import * as codeActionUI from '../components/code-actions'
import * as quickfixUI from '../components/quickfix'
import * as dispatch from '../messaging/dispatch'
import { setCursorColor } from '../core/cursor'
import { uriToPath } from '../support/utils'
import { cursor } from '../core/cursor'
import * as path from 'path'

export interface QuickfixGroup {
  file: string,
  dir: string,
  items: Diagnostic[],
}

interface Distance {
  diagnostic: Diagnostic,
  lines: number,
  characters: number,
}

const cache = {
  diagnostics: new Map<string, Diagnostic[]>(),
  actions: [] as Command[],
  visibleProblems: new Map<string, () => void>(),
}

const distanceAsc = (a: Distance, b: Distance) =>
  a.lines === b.lines ? a.characters < b.characters : a.lines < b.lines

const distanceDesc = (a: Distance, b: Distance) =>
  a.lines === b.lines ? a.characters > b.characters : a.lines > b.lines

const findClosestProblem = (diagnostics: Diagnostic[], line: number, column: number, findNext: boolean) => {
  const distances = diagnostics.map(d => ({
    diagnostic: d,
    lines: d.range.start.line - line,
    characters: d.range.start.character - column,
  } as Distance))

  const sortedProblems = distances.sort((a, b) => findNext
    ? distanceDesc(a, b) ? 1 : 0
    : distanceAsc(a, b) ? 1 : 0)

  const validProblems = findNext
    ? sortedProblems.filter(m => m.lines === 0 ? m.characters > 0 : m.lines > 0)
    : sortedProblems.filter(m => m.lines === 0 ? m.characters < 0 : m.lines < 0)

  return (validProblems[0] || {}).diagnostic
}

const mapToQuickfix = (diagsMap: Map<string, Diagnostic[]>): QuickfixGroup[] => [...diagsMap.entries()]
  .map(([ filepath, diagnostics ]) => ({
    file: path.basename(filepath),
    dir: path.dirname(filepath),
    items: diagnostics,
  }))
  .filter(m => m.items.length)

const getProblemCount = (diagsMap: Map<string, Diagnostic[]>) => {
  const diagnostics = [...diagsMap.values()].reduce((all, curr) => all.concat(curr))
  const errors = diagnostics.filter(d => d.severity === DiagnosticSeverity.Error).length
  const warnings = diagnostics.filter(d => d.severity === DiagnosticSeverity.Warning).length
  return { errors, warnings }
}

onDiagnostics(async m => {
  const path = uriToPath(m.uri)
  cache.diagnostics.set(path, m.diagnostics)
  dispatch.pub('ai:diagnostics.count', getProblemCount(cache.diagnostics))
  if (cache.diagnostics.size) quickfixUI.update(mapToQuickfix(cache.diagnostics))

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
  const { line, column, cwd, file } = vim
  const diagnostics = cache.diagnostics.get(path.join(cwd, file))
  if (!diagnostics) return

  const targetProblem = diagnostics.find(d => positionWithinRange(line - 1, column - 1, d.range))

  targetProblem && problemInfoUI.show({
    row: cursor.row,
    col: cursor.col,
    data: targetProblem.message
  })
})

on.cursorMove(() => problemInfoUI.hide())
on.insertEnter(() => problemInfoUI.hide())
on.insertLeave(() => problemInfoUI.hide())

action('next-problem', async () => {
  const { line, column, cwd, file } = vim
  const diagnostics = cache.diagnostics.get(path.join(cwd, file))
  if (!diagnostics) return

  const problem = findClosestProblem(diagnostics, line - 1, column - 1, true)
  if (!problem) return

  const window = await getCurrent.window
  window.setCursor(problem.range.start.line + 1, problem.range.start.character)
})

action('prev-problem', async () => {
  const { line, column, cwd, file } = vim
  const diagnostics = cache.diagnostics.get(path.join(cwd, file))
  if (!diagnostics) return

  const problem = findClosestProblem(diagnostics, line - 1, column - 1, false)
  if (!problem) return

  const window = await getCurrent.window
  window.setCursor(problem.range.start.line + 1, problem.range.start.character)
})

action('quickfix-open', () => quickfixUI.show())
action('quickfix-close', () => quickfixUI.hide())
action('quickfix-toggle', () => quickfixUI.toggle())

on.cursorMove(async state => {
  const { line, column, cwd, file } = vim
  const diagnostics = cache.diagnostics.get(path.join(cwd, file))
  if (!diagnostics) return

  const relevantDiagnostics = diagnostics
    .filter(d => positionWithinRange(line - 1, column - 1, d.range))

  const actions = await codeAction(state, relevantDiagnostics)

  if (actions && actions.length) {
    cache.actions = actions
    setCursorColor('red')
  }
})

export const runCodeAction = (action: Command) => executeCommand(vim, action)

action('code-action', () => codeActionUI.show(cursor.row, cursor.col, cache.actions))
