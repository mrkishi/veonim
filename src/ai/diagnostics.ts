import { ProblemHighlight, Highlight, HighlightGroupId, on, action, getCurrent,
  current as vim, jumpTo } from '../core/neovim'
import { Command, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver-types'
import { LocationItem, findNext, findPrevious } from '../support/relative-finder'
import { codeAction, onDiagnostics, executeCommand } from '../langserv/adapter'
import { ui as problemInfoUI } from '../components/problem-info'
import { uriToPath, pathRelativeToCwd } from '../support/utils'
import { positionWithinRange } from '../support/neovim-utils'
import * as codeActionUI from '../components/code-actions'
import * as problemsUI from '../components/problems'
import * as dispatch from '../messaging/dispatch'
import { setCursorColor } from '../core/cursor'
import { sessions } from '../core/sessions'
import { cursor } from '../core/cursor'
import '../ai/remote-problems'
import * as path from 'path'

export interface Problem {
  file: string,
  dir: string,
  items: Diagnostic[],
}

type Diags = Map<string, Diagnostic[]>

const cache = {
  diagnostics: new Map<number, Diags>(new Map()),
  problems: new Map<number, Problem[]>(),
  actions: [] as Command[],
  currentBuffer: '',
}

const clearAllDiagnosticsForSource = (source: string) => {
  const sessionDiagnostics = cache.diagnostics.get(sessions.current)
  if (!sessionDiagnostics) return

  const diagValues = [...sessionDiagnostics.entries()]
  const filteredDiagnostics = diagValues.reduce((next, [ path, diagnostics ]) => {
    const cleaned = diagnostics.filter(m => m.source !== source)
    next.set(path, cleaned)
    return next
  }, new Map())

  cache.diagnostics.set(sessions.current, filteredDiagnostics)
}

const updateDiagnostics = (path: string, diagnostics: Diagnostic[]) => {
  const sessionDiagnostics = cache.diagnostics.get(sessions.current)
  if (sessionDiagnostics) return sessionDiagnostics.set(path, diagnostics)
  const newSessionDiags = new Map([ [ path, diagnostics ] ])
  cache.diagnostics.set(sessions.current, newSessionDiags)
}

const current = {
  get diagnostics(): Diags { return cache.diagnostics.get(sessions.current) || new Map() },
  get problems(): Problem[] { return cache.problems.get(sessions.current) || [] },
}

const updateUI = () => {
  const problems = mapAsProblems(current.diagnostics)
  problemsUI.update(problems)
}

const mapAsProblems = (diagsMap: Map<string, Diagnostic[]>): Problem[] =>
  [...diagsMap.entries()]
  .map(([ filepath, diagnostics ]) => ({
    items: diagnostics,
    file: path.basename(pathRelativeToCwd(filepath, vim.cwd)),
    dir: path.dirname(pathRelativeToCwd(filepath, vim.cwd)),
  }))
  .filter(m => m.items.length)

const getDiagnosticLocations = (diags: Map<string, Diagnostic[]>): LocationItem[] => [...diags.entries()]
  .reduce((res, [ path, diagnostics ]) => {
    const pathDiags = diagnostics.map(d => ({
      path,
      line: d.range.start.line + 1,
      column: d.range.start.character,
      endLine: d.range.end.line + 1,
      endColumn: d.range.end.character,
    }))

    return [...res, ...pathDiags]
  }, [] as LocationItem[])

const getProblemCount = (diagsMap: Map<string, Diagnostic[]>) => {
  const diagsList = [...diagsMap.values()]
  if (!diagsList.length) return { errors: 0, warnings: 0 }

  const diagnostics = diagsList.reduce((all, curr) => all.concat(curr))
  const errors = diagnostics.filter(d => d.severity === DiagnosticSeverity.Error).length
  const warnings = diagnostics.filter(d => d.severity === DiagnosticSeverity.Warning).length
  return { errors, warnings }
}

export const addQF = (items: Map<string, Diagnostic[]>, source: string) => {
  clearAllDiagnosticsForSource(source)
  items.forEach((diags, loc) => updateDiagnostics(loc, diags))
  dispatch.pub('ai:diagnostics.count', getProblemCount(current.diagnostics))
  updateUI()
}

const refreshProblemHighlights = async () => {
  const currentBufferPath = path.join(vim.cwd, vim.file)
  const diagnostics = current.diagnostics.get(currentBufferPath) || []
  const buffer = await getCurrent.buffer

  if (!diagnostics.length) return buffer.clearHighlight(HighlightGroupId.Diagnostics, 0, -1)

  const problems: ProblemHighlight[] = diagnostics.map(d => ({
    id: HighlightGroupId.Diagnostics,
    group: Highlight.Undercurl,
    line: d.range.start.line,
    columnStart: d.range.start.character,
    columnEnd: d.range.end.character,
  }))

  buffer.highlightProblems(problems)
}

onDiagnostics(async m => {
  const path = uriToPath(m.uri)
  cache.currentBuffer = path
  updateDiagnostics(path, m.diagnostics)
  dispatch.pub('ai:diagnostics.count', getProblemCount(current.diagnostics))
  if (cache.diagnostics.size) updateUI()
  refreshProblemHighlights()
})

action('show-problem', async () => {
  const { line, column, cwd, file } = vim
  const diagnostics = current.diagnostics.get(path.join(cwd, file))
  if (!diagnostics) return

  const targetProblem = diagnostics.find(d => positionWithinRange(line - 1, column - 1, d.range))
  if (targetProblem) problemInfoUI.show(targetProblem.message)
})

on.cursorMove(problemInfoUI.hide)
on.insertEnter(problemInfoUI.hide)
on.insertLeave(problemInfoUI.hide)

action('next-problem', async () => {
  const { line, column, cwd, file } = vim
  const currentPath = path.join(cwd, file)
  const diagnosticLocations = getDiagnosticLocations(current.diagnostics)
  if (!diagnosticLocations) return

  const problem = findNext(diagnosticLocations, currentPath, line, column - 1)
  if (!problem) return

  jumpTo(problem)
})

action('prev-problem', async () => {
  const { line, column, cwd, file } = vim
  const currentPath = path.join(cwd, file)
  const diagnosticLocations = getDiagnosticLocations(current.diagnostics)
  if (!diagnosticLocations) return

  const problem = findPrevious(diagnosticLocations, currentPath, line, column - 1)
  if (!problem) return

  jumpTo(problem)
})

action('problems-toggle', () => problemsUI.toggle())
action('problems-focus', () => problemsUI.focus())

export const setProblems = (problems: Problem[]) => {
  if (!problems || !problems.length) return
  cache.problems.set(sessions.current, problems)
  updateUI()
}

on.cursorMove(async state => {
  const { line, column, cwd, file } = vim
  const diagnostics = current.diagnostics.get(path.join(cwd, file))
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

dispatch.sub('session:switch', () => {
  dispatch.pub('ai:diagnostics.count', getProblemCount(current.diagnostics))
  updateUI()
  refreshProblemHighlights()
})
