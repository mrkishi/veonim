import { ProblemHighlight, on, action, getCurrent, current as vim } from '../core/neovim'
import { Command, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver-types'
import { codeAction, onDiagnostics, executeCommand } from '../langserv/adapter'
import { positionWithinRange } from '../support/neovim-utils'
import * as problemInfoUI from '../components/problem-info'
import * as codeActionUI from '../components/code-actions'
import * as problemsUI from '../components/problems'
import * as dispatch from '../messaging/dispatch'
import { setCursorColor } from '../core/cursor'
import { uriToPath } from '../support/utils'
import { sessions } from '../core/sessions'
import { cursor } from '../core/cursor'
import '../ai/remote-problems'
import * as path from 'path'

export interface Problem {
  file: string,
  dir: string,
  items: Diagnostic[],
}

interface Distance {
  diagnostic: Diagnostic,
  lines: number,
  characters: number,
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

const updateUI = () => problemsUI.update(mapAsProblems(current.diagnostics))

const mapAsProblems = (diagsMap: Map<string, Diagnostic[]>): Problem[] =>
  [...diagsMap.entries()]
  .map(([ filepath, diagnostics ]) => ({
    file: path.basename(filepath),
    dir: path.dirname(filepath),
    items: diagnostics,
  }))
  .filter(m => m.items.length)

const getProblemCount = (diagsMap: Map<string, Diagnostic[]>) => {
  const diagsList = [...diagsMap.values()]
  if (!diagsList.length) return { errors: 0, warnings: 0 }

  const diagnostics = diagsList.reduce((all, curr) => all.concat(curr))
  const errors = diagnostics.filter(d => d.severity === DiagnosticSeverity.Error).length
  const warnings = diagnostics.filter(d => d.severity === DiagnosticSeverity.Warning).length
  return { errors, warnings }
}

export const addQF = (items: Map<string, Diagnostic[]>) => {
  mapAsProblems(items).forEach(m => {
    const location = path.join(m.dir, m.file)
    updateDiagnostics(location, m.items)
  })

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
  const diagnostics = current.diagnostics.get(path.join(cwd, file))
  if (!diagnostics) return

  const problem = findClosestProblem(diagnostics, line - 1, column - 1, true)
  if (!problem) return

  const window = await getCurrent.window
  window.setCursor(problem.range.start.line + 1, problem.range.start.character)
})

action('prev-problem', async () => {
  const { line, column, cwd, file } = vim
  const diagnostics = current.diagnostics.get(path.join(cwd, file))
  if (!diagnostics) return

  const problem = findClosestProblem(diagnostics, line - 1, column - 1, false)
  if (!problem) return

  const window = await getCurrent.window
  window.setCursor(problem.range.start.line + 1, problem.range.start.character)
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
