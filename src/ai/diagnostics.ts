import { ProblemHighlight, on, action, getCurrent, current as vim, jumpTo } from '../core/neovim'
import { Command, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver-types'
import { LocationItem, findNext, findPrevious } from '../support/relative-finder'
import { codeAction, onDiagnostics, executeCommand } from '../langserv/adapter'
import { uriToPath, pathRelativeToCwd } from '../support/utils'
import { positionWithinRange } from '../support/neovim-utils'
import * as problemInfoUI from '../components/problem-info'
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

interface ActiveProblemHighlight extends ProblemHighlight {
  removeHighlight(): void,
}

type Diags = Map<string, Diagnostic[]>

const cache = {
  diagnostics: new Map<number, Diags>(new Map()),
  problems: new Map<number, Problem[]>(),
  actions: [] as Command[],
  visibleProblems: new Map<string, ActiveProblemHighlight[]>(),
  currentBuffer: '',
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

const updateUI = () => problemsUI.update(mapAsProblems(current.diagnostics))

const mapAsProblems = (diagsMap: Map<string, Diagnostic[]>): Problem[] =>
  [...diagsMap.entries()]
  .map(([ filepath, diagnostics ]) => ({
    file: path.basename(filepath),
    dir: path.dirname(filepath),
    items: diagnostics,
  }))
  .filter(m => m.items.length)

const getDiagnosticLocations = (diags: Map<string, Diagnostic[]>): LocationItem[] => [...diags.entries()]
  .reduce((res, [ path, diagnostics ]) => {
    const pathDiags = diagnostics.map(d => ({
      path,
      line: d.range.start.line,
      column: d.range.start.character,
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

export const addQF = (items: Map<string, Diagnostic[]>) => {
  // TODO: reset cached diagnostics to a clean state. assume incoming diagnostics
  // are the source of truth (for the given source designator)
  items.forEach((diags, loc) => updateDiagnostics(loc, diags))
  dispatch.pub('ai:diagnostics.count', getProblemCount(current.diagnostics))
  updateUI()
}

const problemHighlightsSame = (current: ProblemHighlight, compare: ProblemHighlight) =>
  current.line === compare.line
    && current.columnStart === compare.columnStart
    && current.columnEnd === compare.columnEnd

const includesProblemHighlight = (problems: ProblemHighlight[], problem: ProblemHighlight) =>
  problems.some(p => problemHighlightsSame(p, problem))

const refreshProblemHighlights = async () => {
  const currentBufferPath = path.join(vim.cwd, vim.file)
  const diagnostics = current.diagnostics.get(currentBufferPath) || []
  const getBufReq = getCurrent.buffer

  if (!diagnostics.length) {
    cache.visibleProblems.set(`${sessions.current}:${currentBufferPath}`, [])
    const buffer = await getBufReq
    return buffer.clearAllHighlights()
  }

  const currentProblems = cache.visibleProblems.get(`${sessions.current}:${currentBufferPath}`) || []
  const nextProblems: ProblemHighlight[] = diagnostics.map((d: Diagnostic) => ({
    line: d.range.start.line,
    columnStart: d.range.start.character,
    columnEnd: d.range.end.character,
  }))

  const problemsToRemove = currentProblems.filter(p => !includesProblemHighlight(nextProblems, p))
  const problemsToAdd = nextProblems.filter(p => !includesProblemHighlight(currentProblems, p))
  const untouchedProblems = currentProblems.filter(p => includesProblemHighlight(nextProblems, p))

  problemsToRemove.forEach(problem => problem.removeHighlight())

  const buffer = await getBufReq
  const nextVisibleProblems: ActiveProblemHighlight[] = await Promise.all(problemsToAdd.map(async m => ({
    ...m,
    removeHighlight: await buffer.highlightProblem(m)
  })))

  const visibleProblems = [...untouchedProblems, ...nextVisibleProblems]
  cache.visibleProblems.set(`${sessions.current}:${currentBufferPath}`, visibleProblems)
}

onDiagnostics(async m => {
  const path = uriToPath(m.uri)
  cache.currentBuffer = path
  const relativePath = pathRelativeToCwd(path, vim.cwd)
  updateDiagnostics(relativePath, m.diagnostics)
  dispatch.pub('ai:diagnostics.count', getProblemCount(current.diagnostics))
  if (cache.diagnostics.size) updateUI()
  refreshProblemHighlights()
})

action('show-problem', async () => {
  const { line, column, cwd, file } = vim
  const diagnostics = current.diagnostics.get(path.join(cwd, file))
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
  const currentPath = path.join(cwd, file)
  const diagnosticLocations = getDiagnosticLocations(current.diagnostics)
  if (!diagnosticLocations) return

  const problem = findNext(diagnosticLocations, currentPath, line - 1, column - 1)
  if (!problem) return

  jumpTo(problem)
})

action('prev-problem', async () => {
  const { line, column, cwd, file } = vim
  const currentPath = path.join(cwd, file)
  const diagnosticLocations = getDiagnosticLocations(current.diagnostics)
  if (!diagnosticLocations) return

  const problem = findPrevious(diagnosticLocations, currentPath, line - 1, column - 1)
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
