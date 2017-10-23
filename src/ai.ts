import { fullBufferUpdate, partialBufferUpdate, references, definition, rename, completions, signatureHelp, hover, symbols, workspaceSymbols, triggers } from './langserv/adapter'
import { g, ex, action, autocmd, until, cwdir, call, expr, feedkeys, current as vim } from './ui/neovim'
import { cc, debounce, merge, findIndexRight, hasUpperCase, EarlyPromise } from './utils'
import { CompletionItemKind } from 'vscode-languageserver-types'
import * as harvester from './ui/plugins/keyword-harvester'
import * as completionUI from './ui/plugins/autocomplete'
import * as symbolsUI from './ui/plugins/symbols'
import * as hoverUI from './ui/plugins/hover'
import { filter } from 'fuzzaldrin-plus'
import vimUI from './ui/canvasgrid'
import { sub } from './dispatch'

export interface CompletionOption {
  text: string,
  kind: CompletionItemKind,
}

interface Cache {
  completionItems: string[],
  filetype: string,
  file: string,
  revision: number,
  cwd: string
  semanticCompletions: Map<string, CompletionOption[]>
}

export const cache: Cache = {
  filetype: '',
  file: '',
  revision: -1,
  cwd: '',
  completionItems: [],
  semanticCompletions: new Map()
}

const maxResults = 8
const state = {
  pauseUpdate: false,
  hoverVisible: false,
}

const fileInfo = () => {
  const { cwd, file, filetype, revision } = cache
  return { cwd, file, filetype, revision }
}

const orderCompletions = (m: CompletionOption[], query: string) =>
  m.slice().sort(({ text }) => hasUpperCase(text) ? -1 : text.startsWith(query) ? -1 : 1)

const calcMenuPosition = (startIndex: number, column: number, count: number) => {
  // anchor menu above row if the maximum results are going to spill out of bounds.
  // why maxResults instead of the # of items in options? because having the menu jump
  // around over-under as you narrow down results by typing or undo is kinda annoying
  const row = vimUI.cursor.row + maxResults > vimUI.rows
    ? vimUI.cursor.row - count
    : vimUI.cursor.row + 1

  const start = Math.max(0, startIndex)
  const col = vimUI.cursor.col - (column - start)
  return { y: vimUI.rowToY(row), x: vimUI.colToX(col) }
}

const findQuery = (line: string, column: number) => {
  const start = findIndexRight(line, /[^\w\-]/, column - 2) || 0
  const startIndex = start ? start + 1 : 0
  const query = line.slice(startIndex, column - 1) || ''
  const leftChar = line[start]
  return { startIndex, query, leftChar }
}

const updateVim = (items: string[]) => {
  cache.completionItems = items
  g.veonim_completions = items
}

const updateServer = async (lineChange = false) => {
  if (lineChange) partialBufferUpdate({
    ...fileInfo(),
    ...await vim.position,
    buffer: [ await vim.lineContent ]
  })

  else {
    const buffer = await vim.bufferContents
    harvester.update(cache.cwd, cache.file, buffer)
    fullBufferUpdate({ ...fileInfo(), ...await vim.position, buffer })
  }
}

// TODO: could change this to 'needsUpdate' returns true or not
const attemptUpdate = async (lineChange = false) => {
  if (state.pauseUpdate) return
  const currentRevision = await vim.revision
  if (currentRevision > cache.revision) updateServer(lineChange)
  cache.revision = currentRevision
}

const getSemanticCompletions = (line: number, column: number) => EarlyPromise(async done => {
  if (cache.semanticCompletions.has(`${line}:${column}`)) 
    return done(cache.semanticCompletions.get(`${line}:${column}`)!)

  // TODO: textChangedI will also fire, how can optimize so only once called (updateServer)?
  await updateServer(true)
  console.time('LSP COMPLETIONS')
  const items = await completions({ ...fileInfo(), line, column })
  console.timeEnd('LSP COMPLETIONS')
  console.log('completions recv from the server:', items.length)
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
    updateVim(options.map(m => m.text))
    const { x, y } = calcMenuPosition(startIndex, column, options.length)
    completionUI.show({ x, y, options })
  }

  const { startIndex, query, leftChar } = findQuery(lineContent, column)
  const triggerChars = triggers.completion(cache.cwd, cache.filetype)
  let semanticCompletions: CompletionOption[] = []

  if (triggerChars.includes(leftChar)) {
    // TODO: this thing needs a better test case to illustrate the issueZ
    //
    // how about
    //
    // server request takes 3000ms
    // timeout is 10ms
    // user actions create a query from '' to 'derp' BEFORE 3000ms. 
    // completion menu is now populated with keywords.
    // we are 4 chars in the query
    // FINALLY 3s later we get semantic completions
    // NOW WHAT?!
    // - take over the completion menu?
    // - ignore?
    // - try to maintain some order and merge gracefully? i.e. preserve the first tab option in case user hits tab
    // while the completionUI is being updated? other items are semantic? [ keyword, semantic, semantic ] etc
    //
    //
    // ALSO in the eventually:
    // - what if we move to another place in the document?
    // - what if leave insert mode.
    // - seems like we need to trakc the current line + startIndex that completion is being operated on
    // if either/or keyword + semantic awaits are taking too long, they should be canceled and terminated.
    // in the case of semantic a $/cancelRequest should be sent and promise canceled
    //
    // THIS WHOLE THING IS KINDA POINTLESS UNLESS WE ANSWER THE FOLLOWING PHILOSOPHICAL QUESTION?
    // (because in most cases the lang serv will be quick enough to return completions before a query is started)
    // sidenote:
    //
    // should we return keyword completions if leftChar === '.' and no query && semantic completions lookup is
    // taking too long? does it improve responsiveness to return probably wrong data? worth it?
    const pendingSemanticCompletions = getSemanticCompletions(line, startIndex + 1)
    pendingSemanticCompletions.eventually(completions => {
      if (!query.length) showCompletions(completions)
      // if (query.length) then.... what? ( see above? )
    })

    semanticCompletions = await pendingSemanticCompletions.maybeAfter({ time: 50, or: [] })
  }

  if (!query.length && semanticCompletions.length) return showCompletions(semanticCompletions)

  if (query.length || semanticCompletions.length) {
    // TODO: i think it would be better if we got keywords that matched the given query (aka. filter in worker thread)
    // otherwise in a large file this could return a METRIC FUCK TON of stuff and slow the UI thread down
    // with processing and filtering

    // TODO: assuming we move the keyword filtering to the worker thread, can we run keyword filtering + semantic completion filtering in parallel?
    //
    // something like:
    // const keywordOptions = harvester.findKeywords(cwd, file, queryCased)
    // const semanticOptions = filter(semanticCompletions, queryCased, { maxResults, key: 'text' })
    // const completionOptions = semanticOptions.length ? semanticOptions : await keywordOptions

    // TODO: i think worker thread should memoize query + gathered keywords and not filter over the entire
    // list every single time

    const keywords = (await harvester.getKeywords(cache.cwd, cache.file) || [])
      .map(text => ({ text, kind: CompletionItemKind.Text }))

    if (!keywords.length && !semanticCompletions.length) return
    // TODO: need better way of combining... and async...
    // want to wait about ~50ms for semantic request, then async combine later
    // TODO: does it make sense to combine keywords with semantic completions? - right now it's either or...
    // i mean could try to do some sort of combination with ranking/priority. idk if the filtering will interfere with it
    // TODO: do we want more than maxResults? i.e. i want to explore all of Array.prototype.* completions
    // and i want to scroll thru the list. should i support that use case? or just use the query to filter?
    const queryCased = smartCaseQuery(query)
    const resSemantic = filter(semanticCompletions, queryCased, { maxResults, key: 'text' })
    const completionOptions = resSemantic.length
      ? resSemantic
      : filter(keywords, queryCased, { maxResults, key: 'text' })

    if (!completionOptions.length) {
      updateVim([])
      completionUI.hide()
      return
    }

    showCompletions(completionOptions)

    g.veonim_complete_pos = startIndex
  } else {
    completionUI.hide()
    updateVim([])
  }
}

// TODO: this will be auto-triggered. get triggerChars from server.canDo
// TODO: try to figure out if we are inside func call? too much work? (so this func is not called when outside func)
// TODO: i think given the list of trigger characters, some guess work is due from our part
// according to vscode, it really literally triggers on the specified trigger char. hold the hint in insert mode, update on trigger chars. on resume a new trigger char has to be pressed. also need to figure out how hint disappears. for ( open bracket it's easy to find close, but for other langs???
const getSignatureHint = async (lineContent: string, line: number, column: number) => {
  const triggerChars = triggers.signatureHelp(cache.cwd, cache.filetype)
  const leftChar = lineContent[Math.max(column - 2, 0)]

  if (!triggerChars.includes(leftChar)) return

  // TODO: textChangedI will also fire, how can optimize so only once called?
  await updateServer(true)
  const hint = await signatureHelp({ ...fileInfo(), line, column })
  if (!hint.signatures.length) return
  // TODO: support list of signatures?

  // TODO: don't reposition signature if already active (same up)
  // TODO: do however, updated the bolded parameters
  const { label } = hint.signatures[0]
  const y = vimUI.rowToY(vimUI.cursor.row - 1)
  const x = vimUI.colToX(column)
  hoverUI.show({ html: label, x, y })
  state.hoverVisible = true
  // TODO: highlight params
}

// TODO: create queue for firing these events in proper order
// certain events will have higher order.
// clear stack, then call queue items in priority order


autocmd.bufEnter(debounce(async () => {
  const [ cwd, file, filetype, revision ] = await cc(cwdir(), vim.file, vim.filetype, vim.revision)
  merge(cache, { cwd, file, filetype, revision })
  updateServer()
}, 100))

autocmd.textChanged(debounce(() => attemptUpdate(), 200))
autocmd.textChangedI(() => attemptUpdate(true))
autocmd.cursorMoved(() => state.hoverVisible && hoverUI.hide())
autocmd.insertEnter(() => state.hoverVisible && hoverUI.hide())

autocmd.cursorMovedI(async () => {
  // TODO: inefficient with textChangedI because calling lineContent 2x
  const [ lineContent, { line, column } ] = await cc(vim.lineContent, vim.position)
  getCompletions(lineContent, line, column)
  getSignatureHint(lineContent, line, column)
})

autocmd.insertLeave(() => {
  cache.semanticCompletions.clear()
  completionUI.hide()
  // TODO: maybe just check state in the component? tracking two states gonna have a bad time
  state.hoverVisible && hoverUI.hide()
  !state.pauseUpdate && updateServer()
})

autocmd.completeDone(async () => {
  g.veonim_completing = 0
  const { word } = await expr(`v:completed_item`)
  harvester.addWord(cache.cwd, cache.file, word)
  updateVim([])
})

sub('pmenu.select', ix => completionUI.select(ix))
sub('pmenu.hide', () => completionUI.hide())

action('references', async () => {
  const refs = await references({ ...fileInfo(), ...await vim.position })

  await call.setloclist(0, refs.map(m => ({
    lnum: m.line,
    col: m.column,
    text: m.desc
  })))

  ex('lopen')
  ex('wincmd p')
})

action('definition', async () => {
  const { line, column } = await definition({ ...fileInfo(), ...await vim.position })
  if (!line || !column) return
  await call.cursor(line, column)
})

action('rename', async () => {
  state.pauseUpdate = true
  await feedkeys('ciw')
  await until.insertLeave()
  const newName = await expr('@.')
  await feedkeys('u')
  state.pauseUpdate = false
  const patches = await rename({ ...fileInfo(), ...await vim.position, newName })
  // TODO: change other files besides current buffer. using fs operations if not modified?
  patches.forEach(({ operations }) => call.PatchCurrentBuffer(operations))
})

action('hover', async () => {
  const { line, column } = await vim.position
  const html = await hover({ ...fileInfo(), line, column })
  // TODO: get start column of the object
  // TODO: if multi-line html, anchor from bottom
  const y = vimUI.rowToY(vimUI.cursor.row - 1)
  const x = vimUI.colToX(column)
  hoverUI.show({ html, x, y })
  state.hoverVisible = true
})

action('symbols', async () => {
  const listOfSymbols = await symbols(fileInfo())
  listOfSymbols && symbolsUI.show(listOfSymbols)
})

action('workspace-symbols', async () => {
  const listOfSymbols = await workspaceSymbols(fileInfo())
  listOfSymbols && symbolsUI.show(listOfSymbols)
})
