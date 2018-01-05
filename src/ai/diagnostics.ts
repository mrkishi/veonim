import { Command, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver-types'
import { codeAction, onDiagnostics, executeCommand } from '../langserv/adapter'
import { on, call, action, getCurrent, current as vim } from '../core/neovim'
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
  quickfix: [] as QuickfixGroup[],
  diagnostics: new Map<string, Diagnostic[]>(),
  actions: [] as Command[],
  visibleProblems: new Map<string, () => void>(),
  currentBuffer: '',
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

const updateUI = () => {
  const diagsqf = mapToQuickfix(cache.diagnostics)
  const problems = mergeQuickfixWithDiagnostics(cache.quickfix, diagsqf)
  quickfixUI.update(problems)
}

const mapToQuickfix = (diagsMap: Map<string, Diagnostic[]>): QuickfixGroup[] =>
  [...diagsMap.entries()]
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

const mergeQuickfixWithDiagnostics = (quickfix: QuickfixGroup[], diagnostics: QuickfixGroup[]): QuickfixGroup[] => {
  // in my observation langserv only updates diangnostics for the current buffer.
  // this means that any other buffer could be outdated. quickfix population via linter/compiler
  // should be the ultimate source of truth, overriding any outdated buffer diagnostics

  // however, because the current buffer has langserv support, it should be more up to date
  // than a compiler or linter run output. (thus current buf takes highest priority)
  if (!quickfix.length) return diagnostics

  return diagnostics.reduce((qf, d) => {
    const diagPath = path.join(d.dir, d.file)
    if (diagPath === cache.currentBuffer) return (qf.push(d), qf)

    const has = qf.some(q => path.join(q.dir, q.file) === diagPath)
    if (!has) qf.push(d)

    return qf
  }, quickfix)
}

const quickfixTypeToSeverity = (type?: string): DiagnosticSeverity => {
  if (type === '1' || type === 'E') return DiagnosticSeverity.Error
  if (type === '2' || type === 'W') return DiagnosticSeverity.Warning
  if (type === '3' || type === 'I') return DiagnosticSeverity.Information
  if (type === '4' || type === 'H') return DiagnosticSeverity.Hint
  else return DiagnosticSeverity.Error
}

const getVimQuickfix = async (): Promise<QuickfixGroup[]> => {
  const list = await call.getqflist()
  const qfgroup = list.reduce((map, { bufnr, lnum, col, type, text }) => {
    const item = {
      range: {
        start: { line: lnum, character: col },
        end: { line: lnum, character: col },
      },
      severity: quickfixTypeToSeverity(type),
      message: text,
    }

    map.has(bufnr)
      ? map.get(bufnr)!.push(item)
      : map.set(bufnr, [ item ])

    return map
  }, new Map<number | undefined, Diagnostic[]>())

  const qftask = [...qfgroup.entries()].map(async ([ bufnr, items ]) => ({
    items,
    filepath: bufnr ? await call.bufname(bufnr) : undefined,
  }))

  const qfnames = (await Promise.all(qftask)).filter(m => m.filepath)

  return qfnames.map(m => ({
    items: m.items,
    file: path.basename(m.filepath as string),
    dir: path.dirname(m.filepath as string),
  }))
}

onDiagnostics(async m => {
  const path = uriToPath(m.uri)
  cache.currentBuffer = path
  cache.diagnostics.set(path, m.diagnostics)
  dispatch.pub('ai:diagnostics.count', getProblemCount(cache.diagnostics))
  if (cache.diagnostics.size) updateUI()

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

// TODO: this is temporary. triggered via user autocmd, hooked up to ale or neomake
// the idea is that whenever ale runs, it fires an autocmd. the quickfix list should be
// updated. we will read and parse the qflist and merge it with diagnostics.
//
// in the future it would be nice to implement a custom quickfix window renderer
action('refresh-vim-quickfix', async () => {
  cache.quickfix = await getVimQuickfix()
  updateUI()
})

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
