import { g, on, cmd, current as vimState, onCreate } from '../ui/neovim'
import { findIndexRight, hasUpperCase, EarlyPromise } from '../utils'
import { CompletionItemKind } from 'vscode-languageserver-types'
import * as harvester from '../ui/plugins/keyword-harvester'
import { completions, triggers } from '../langserv/adapter'
import * as completionUI from '../ui/plugins/autocomplete'
import { filter } from 'fuzzaldrin-plus'
import vimUI from '../ui/canvasgrid'
import { sub } from '../dispatch'

interface Cache {
  semanticCompletions: Map<string, CompletionOption[]>,
  activeCompletion: string,
}

export interface CompletionOption {
  text: string,
  kind: CompletionItemKind,
}

const MAX_RESULTS = 8
export const cache: Cache = {
  semanticCompletions: new Map(),
  activeCompletion: '',
}

// TODO: should this just use smart pos?
const calcMenuPosition = (startIndex: number, column: number, count: number) => {
  // anchor menu above row if the maximum results are going to spill out of bounds.
  // why maxResults instead of the # of items in options? because having the menu jump
  // around over-under as you narrow down results by typing or undo is kinda annoying
  const row = vimUI.cursor.row + MAX_RESULTS > vimUI.rows
    ? vimUI.cursor.row - count
    : vimUI.cursor.row + 1

  const start = Math.max(0, startIndex)
  const col = vimUI.cursor.col - (column - start)
  return { y: vimUI.rowToY(row), x: vimUI.colToX(col) }
}

const orderCompletions = (m: CompletionOption[], query: string) =>
  m.slice().sort(({ text }) => hasUpperCase(text) ? -1 : text.startsWith(query) ? -1 : 1)

const findQuery = (line: string, column: number) => {
  const start = findIndexRight(line, /[^\w\-]/, column - 2) || 0
  const startIndex = start ? start + 1 : 0
  const query = line.slice(startIndex, column - 1) || ''
  const leftChar = line[start]
  return { startIndex, query, leftChar }
}

const getSemanticCompletions = (line: number, column: number) => EarlyPromise(async done => {
  if (cache.semanticCompletions.has(`${line}:${column}`)) 
    return done(cache.semanticCompletions.get(`${line}:${column}`)!)

  const items = await completions(vimState)
  const options = items.map(({ label: text, kind = CompletionItemKind.Text }) => ({ text, kind }))
  cache.semanticCompletions.set(`${line}:${column}`, options)
  done(options)
})

// allow the filter engine to rank camel case completions higher. i.e. getUserInfo > gui for query 'gui'
const smartCaseQuery = (query: string): string => hasUpperCase(query[0])
  ? query
  : query[0] + query.slice(1).toUpperCase()

// TODO: call completionItem/resolve to get more info about selected completion item
// TODO: call semanticCompletions for global typings.merge with keywords? (aka non-trigger char stuff)
const getCompletions = async (lineContent: string, line: number, column: number) => {
  const showCompletions = (completions: CompletionOption[]) => {
    const options = orderCompletions(completions, query)
    g.veonim_completions = options.map(m => m.text)
    const { x, y } = calcMenuPosition(startIndex, column, options.length)
    completionUI.show({ x, y, options })
  }

  const { startIndex, query, leftChar } = findQuery(lineContent, column)
  const triggerChars = triggers.completion(vimState.cwd, vimState.filetype)
  let semanticCompletions: CompletionOption[] = []

  if (triggerChars.includes(leftChar)) {
    const pendingSemanticCompletions = getSemanticCompletions(line, startIndex + 1)
    cache.activeCompletion = `${line}:${startIndex}`

    // TODO: send a $/cancelRequest on insertLeave if not intersted anymore
    // maybe there is also a way to cancel if we moved to another completion location in the doc
    pendingSemanticCompletions.eventually(completions => {
      // this returned late and we started another completion and this one is irrelevant
      if (cache.activeCompletion !== `${line}:${startIndex}`) return
      semanticCompletions = completions
      if (!query.length) showCompletions(completions)

      // how annoying is delayed semantic completions overriding pmenu? enable this if so:
      //else showCompletions([...cache.completionItems.slice(0, 1), ...completions])
    })

    semanticCompletions = await pendingSemanticCompletions.maybeAfter({ time: 50, or: [] })
  }

  if (!query.length && semanticCompletions.length) return showCompletions(semanticCompletions)

  if (query.length || semanticCompletions.length) {
    const queryCased = smartCaseQuery(query)
    const pendingKeywords = harvester
      .queryKeywords(vimState.cwd, vimState.file, queryCased, MAX_RESULTS)
      .then(res => res.map(text => ({ text, kind: CompletionItemKind.Text })))

    // TODO: does it make sense to combine keywords with semantic completions? - right now it's either or...
    // i mean could try to do some sort of combination with ranking/priority. idk if the filtering will interfere with it
    // TODO: do we want more than MAX_RESULTS? i.e. i want to explore all of Array.prototype.* completions
    // and i want to scroll thru the list. should i support that use case? or just use the query to filter?
    const resSemantic = filter(semanticCompletions, queryCased, { maxResults: MAX_RESULTS, key: 'text' })
    const completionOptions = resSemantic.length ? resSemantic : await pendingKeywords

    if (!completionOptions.length) {
      g.veonim_completions = []
      completionUI.hide()
      return
    }

    showCompletions(completionOptions)

    g.veonim_complete_pos = startIndex
  } else {
    completionUI.hide()
    g.veonim_completions = []
  }
}

on.insertLeave(async () => {
  cache.activeCompletion = ''
  cache.semanticCompletions.clear()
  completionUI.hide()
})

on.completion((word, { cwd, file }) => {
  harvester.addWord(cwd, file, word)
  g.veonim_completing = 0
  g.veonim_completions = []
})

sub('pmenu.select', ix => completionUI.select(ix))
sub('pmenu.hide', () => completionUI.hide())

onCreate(() => {
  g.veonim_completing = 0
  g.veonim_complete_pos = 1
  g.veonim_completions = []

  cmd(`set completefunc=VeonimComplete`)
  cmd(`ino <expr> <tab> CompleteScroll(1)`)
  cmd(`ino <expr> <s-tab> CompleteScroll(0)`)
})

export { getCompletions }
