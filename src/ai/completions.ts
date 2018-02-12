import { findIndexRight, hasUpperCase, EarlyPromise, exists, getDirFiles, resolvePath } from '../support/utils'
import { completions, completionDetail, triggers } from '../langserv/adapter'
import { CompletionItemKind } from 'vscode-languageserver-types'
import { CompletionItem } from 'vscode-languageserver-types'
import { g, on, current as vimState } from '../core/neovim'
import * as completionUI from '../components/autocomplete'
import { harvester, update } from '../ai/update-server'
import { sub } from '../messaging/dispatch'
import { filter } from 'fuzzaldrin-plus'
import { cursor } from '../core/cursor'
import { join, dirname } from 'path'

interface Cache {
  semanticCompletions: Map<string, CompletionOption[]>,
  activeCompletion: string,
}

export interface CompletionOption {
  text: string,
  kind: CompletionItemKind,
  // TODO: raw is used to get more completion detail. perhaps should change
  // prop name to reflect that
  raw?: CompletionItem,
}

const MAX_SEARCH_RESULTS = 50
export const cache: Cache = {
  semanticCompletions: new Map(),
  activeCompletion: '',
}

const calcMenuPosition = (startIndex: number, column: number) => ({
  row: cursor.row,
  col: cursor.col - (column - Math.max(0, startIndex)),
})

const orderCompletions = (m: CompletionOption[], query: string) => m
  .slice()
  .sort(({ text }) => hasUpperCase(text) ? -1 : text.startsWith(query) ? -1 : 1)

const findQuery = (line: string, column: number) => {
  const start = findIndexRight(line, /[^\w\-]/, column - 2) || 0
  const startIndex = start ? start + 1 : 0
  const query = line.slice(startIndex, column - 1) || ''
  const leftChar = line[start]
  return { startIndex, query, leftChar }
}

const findPathPerhaps = (lineContent: string, column: number) => {
  const match = lineContent.match(/(?:\/|\.\/|\.\.\/|~\/).*\//)
    || lineContent.match(/(\/|\.\/|\.\.\/|~\/)/)
    || [] as RegExpMatchArray

  if (!match[0] || !match.index) return { foundPath: '', startIndex: -1, query: '' }

  const foundPath = match[0]
  const startIndex = match.index + match[0].length
  const query = lineContent.slice(startIndex, column - 1)

  return { foundPath, startIndex, query }
}

const reallyResolvePath = (path: string) => {
  const filepath = join(vimState.cwd, vimState.file)
  const fileDir = dirname(filepath)
  return resolvePath(path, fileDir)
}

const possiblePathCompletion = async (lineContent: string, column: number) => {
  const { foundPath, startIndex, query } = findPathPerhaps(lineContent, column)
  const fullpath = reallyResolvePath(foundPath) || ''
  const valid = fullpath && await exists(fullpath)
  return { valid, startIndex, query, fullpath }
}

const getPathCompletions = async (path: string, query: string) => {
  const dirFiles = (await getDirFiles(path)).map(m => m.name)
  const results = query ? filter(dirFiles, query) : dirFiles.slice(0, 50)

  return results.map(path => ({
    text: path,
    kind: CompletionItemKind.File,
  }))
}

const getSemanticCompletions = (line: number, column: number) => EarlyPromise(async done => {
  if (cache.semanticCompletions.has(`${line}:${column}`)) 
    return done(cache.semanticCompletions.get(`${line}:${column}`)!)

  const items = await completions(vimState)

  const options = items.map(m => ({
    raw: m,
    text: m.label,
    kind: m.kind || CompletionItemKind.Text,
  }))

  cache.semanticCompletions.set(`${line}:${column}`, options)
  done(options)
})

// allow the filter engine to rank camel case completions higher. i.e. getUserInfo > gui for query 'gui'
const smartCaseQuery = (query: string): string => hasUpperCase(query[0])
  ? query
  : query[0] + query.slice(1).toUpperCase()

const showCompletionsRaw = (column: number, query: string, startIndex: number) => (completions: CompletionOption[]) => {
  const options = orderCompletions(completions, query)
  g.veonim_completions = options.map(m => m.text)
  g.veonim_complete_pos = startIndex
  const { row, col } = calcMenuPosition(startIndex, column)
  completionUI.show({ row, col, options })
}

// TODO: merge global semanticCompletions with keywords?
const getCompletions = async (lineContent: string, line: number, column: number) => {
  const { startIndex, query, leftChar } = findQuery(lineContent, column)
  const showCompletions = showCompletionsRaw(column, query, startIndex)
  const triggerChars = triggers.completion(vimState.cwd, vimState.filetype)
  let semanticCompletions: CompletionOption[] = []

  cache.activeCompletion = `${line}:${startIndex}`

  const {
    fullpath,
    query: pathQuery,
    startIndex: pathStartIndex,
    valid: looksLikeWeNeedToCompleteAPath,
  } = await possiblePathCompletion(lineContent, column)

  if (looksLikeWeNeedToCompleteAPath) {
    const options = await getPathCompletions(fullpath, pathQuery)
    if (!options.length) return
    showCompletionsRaw(column, pathQuery, pathStartIndex)(options)
    return
  }

  if (triggerChars.includes(leftChar) || query.length) {
    const pendingSemanticCompletions = getSemanticCompletions(line, startIndex + 1)

    // TODO: send a $/cancelRequest on insertLeave if not intersted anymore
    // maybe there is also a way to cancel if we moved to another completion location in the doc
    pendingSemanticCompletions.eventually(completions => {
      // this returned late; we started another completion and now this one is irrelevant
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
      .request
      .query(vimState.cwd, vimState.file, queryCased, MAX_SEARCH_RESULTS)
      .then((res: string[]) => res.map(text => ({ text, kind: CompletionItemKind.Text })))

    // TODO: does it make sense to combine keywords with semantic completions? - right now it's either or...
    // i mean could try to do some sort of combination with ranking/priority. idk if the filtering will interfere with it
    // TODO: do we want more than MAX_SEARCH_RESULTS? i.e. i want to explore all of Array.prototype.* completions
    // and i want to scroll thru the list. should i support that use case? or just use the query to filter?
    const resSemantic = filter(semanticCompletions, queryCased, { maxResults: MAX_SEARCH_RESULTS, key: 'text' })
    const completionOptions = resSemantic.length ? resSemantic : await pendingKeywords

    if (!completionOptions.length) {
      g.veonim_completions = []
      completionUI.hide()
      return
    }

    showCompletions(completionOptions)
  } else {
    completionUI.hide()
    g.veonim_completions = []
  }
}

export const getCompletionDetail = (item: CompletionItem) => completionDetail(vimState, item)

on.insertLeave(async () => {
  cache.activeCompletion = ''
  cache.semanticCompletions.clear()
  completionUI.hide()
  update()
})

on.completion((word, { cwd, file }) => {
  harvester.call.add(cwd, file, word)
  g.veonim_completing = 0
  g.veonim_completions = []
})

sub('pmenu.select', ix => completionUI.select(ix))
sub('pmenu.hide', () => completionUI.hide())

export { getCompletions }
