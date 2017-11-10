import { fullBufferUpdate, partialBufferUpdate, references, definition, rename, completions, signatureHelp, hover, symbols, workspaceSymbols, triggers } from './langserv/adapter'
import { g, ex, action, autocmd, onStateChange, until, call, expr, feedkeys, current as vim, getCurrent as getVim } from './ui/neovim'
import { cc, debounce, merge, findIndexRight, hasUpperCase, EarlyPromise } from './utils'
import { CompletionItemKind } from 'vscode-languageserver-types'
import { getColorData, setColorScheme } from './color-service'
import * as harvester from './ui/plugins/keyword-harvester'
import * as completionUI from './ui/plugins/autocomplete'
import * as symbolsUI from './ui/plugins/symbols'
import * as hoverUI from './ui/plugins/hover'
import * as hintUI from './ui/plugins/hint'
import { filter } from 'fuzzaldrin-plus'
import vimUI from './ui/canvasgrid'
import { sub } from './dispatch'

export interface CompletionOption {
  text: string,
  kind: CompletionItemKind,
}

interface Cache {
  semanticCompletions: Map<string, CompletionOption[]>
}

// TODO: 
// also once this shared cache state is in neovim begin to extract out
// different parts of the AI to different modules
export const cache: Cache = {
  semanticCompletions: new Map()
}

const maxResults = 8
const state = {
  activeCompletion: '',
  pauseUpdate: false,
  lastRevision: -1,
}

const fileInfo = () => {
  const { cwd, file, filetype, revision } = vim
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

const needsUpdate = (): boolean => {
  if (state.pauseUpdate) return false
  return vim.revision > state.lastRevision
}

const updateServer = async ({ lineChange = false } = {}) => {
  state.lastRevision = vim.revision

  if (lineChange) partialBufferUpdate({
    ...fileInfo(),
    ...await getVim.position,
    buffer: [ await getVim.lineContent ]
  })

  else {
    const buffer = await getVim.bufferContents
    harvester.update(vim.cwd, vim.file, buffer)
    fullBufferUpdate({ ...fileInfo(), ...await getVim.position, buffer })
  }
}

const getSemanticCompletions = (line: number, column: number) => EarlyPromise(async done => {
  if (cache.semanticCompletions.has(`${line}:${column}`)) 
    return done(cache.semanticCompletions.get(`${line}:${column}`)!)

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
    g.veonim_completions = options.map(m => m.text)
    const { x, y } = calcMenuPosition(startIndex, column, options.length)
    completionUI.show({ x, y, options })
  }

  const { startIndex, query, leftChar } = findQuery(lineContent, column)
  const triggerChars = triggers.completion(vim.cwd, vim.filetype)
  let semanticCompletions: CompletionOption[] = []

  if (triggerChars.includes(leftChar)) {
    const pendingSemanticCompletions = getSemanticCompletions(line, startIndex + 1)
    state.activeCompletion = `${line}:${startIndex}`

    // TODO: send a $/cancelRequest on insertLeave if not intersted anymore
    // maybe there is also a way to cancel if we moved to another completion location in the doc
    pendingSemanticCompletions.eventually(completions => {
      // this returned late and we started another completion and this one is irrelevant
      if (state.activeCompletion !== `${line}:${startIndex}`) return
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
      .queryKeywords(vim.cwd, vim.file, queryCased, maxResults)
      .then(res => res.map(text => ({ text, kind: CompletionItemKind.Text })))

    // TODO: does it make sense to combine keywords with semantic completions? - right now it's either or...
    // i mean could try to do some sort of combination with ranking/priority. idk if the filtering will interfere with it
    // TODO: do we want more than maxResults? i.e. i want to explore all of Array.prototype.* completions
    // and i want to scroll thru the list. should i support that use case? or just use the query to filter?
    const resSemantic = filter(semanticCompletions, queryCased, { maxResults, key: 'text' })
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

const shouldCloseSignatureHint = (totalParams: number, currentParam: number, triggers: string[], leftChar: string): boolean => {
  if (currentParam < totalParams - 1) return false

  const hasEasilyIdentifiableSymmetricalMatcherChar = triggers.some(t => ['(', '{', '['].includes(t))
  if (!hasEasilyIdentifiableSymmetricalMatcherChar) return true

  return (leftChar === ')' && triggers.includes('('))
    || (leftChar === '}' && triggers.includes('{'))
    || (leftChar === ']' && triggers.includes('['))
}

const shs = {
  totalParams: 0,
  currentParam: 0,
}

const getSignatureHint = async (lineContent: string, line: number, column: number) => {
  const triggerChars = triggers.signatureHelp(vim.cwd, vim.filetype)
  const leftChar = lineContent[Math.max(column - 2, 0)]

  // TODO: should probably also hide if we jumped to another line
  if (shouldCloseSignatureHint(shs.totalParams, shs.currentParam, triggerChars, leftChar)) {
    hintUI.hide()
    return
  }

  if (!triggerChars.includes(leftChar)) return

  const hint = await signatureHelp({ ...fileInfo(), line, column })
  if (!hint) return

  const { activeParameter, activeSignature, signatures = [] } = hint
  if (!signatures.length) return

  const { label = '', documentation = '', parameters = [] } = signatures[activeSignature || 0] || {}
  const { label: currentParam = '' } = parameters[activeParameter || 0] || {}

  merge(shs, {
    totalParams: parameters.length,
    currentParam: activeParameter,
  })

  // TODO: figure out a way to switch different signatures...
  // - cache signatures in state
  // - add actions :Veonim next-sig (can be keybound) (ctrl+shift+n?)
  // - on action switch active displayed signature/redraw

  hintUI.show({
    label,
    currentParam,
    row: vimUI.cursor.row,
    col: column,
    info: documentation
  })
}

// TODO: TESTING
onStateChange.cwd((dir: string) => {
  console.log('current dir', vim.cwd)
  console.log('dir changed:', dir)
})

onStateChange.filetype((ft: string) => {
  console.log('current ft', vim.filetype)
  console.log('ft changed:', ft)
})

onStateChange.colorscheme((color: string) => setColorScheme(color))

autocmd.bufEnter(debounce(() => updateServer(), 100))
autocmd.textChanged(debounce(() => needsUpdate() && updateServer(), 200))

autocmd.cursorMoved(() => {
  hoverUI.hide()
  hintUI.hide()
})

autocmd.insertEnter(() => {
  hoverUI.hide()
  hintUI.hide()
})

autocmd.cursorMovedI(async () => {
  // it is within the realm of possiblity that cursor move in insert mode does
  // not always mean a text change. initally the idea was to subscribe to
  // textChangedI for buffer changes and cursorMovedI to trigger language server
  // events. however in practice this became more complex as the firing order of
  // vim autocmd events is not deterministic. effectively this meant that lang
  // server events were being triggered before buffer updates were syncd to the
  // lang server.
  //
  // resolving this issue while maintaing both autocmds would mean a complex
  // deferred mechanism in which cursorMovedI would only execute its callbacks
  // after textChangedI fires. (remember that callback order is not guaranteed
  // and textChangedI + cursorMovedI may not always occur at the same time)
  //
  // it seems simpler to skip textChangedI and check buffer revision status
  // in cursorMovedI (to sync the buffer). in practice cursorMovedI almost
  // always will also mean textChangedI (unless you're a filthy uncultured
  // philistine swine who moves around in insert mode with arrow keys)
  // so in the rare cases where a text change did not actually occur while
  // the cursor moved, it means an extra call that vim has to process
  if (needsUpdate()) await updateServer({ lineChange: true })
  const [ lineContent, { line, column } ] = await cc(getVim.lineContent, getVim.position)
  getCompletions(lineContent, line, column)
  getSignatureHint(lineContent, line, column)
})

autocmd.insertLeave(async () => {
  state.activeCompletion = ''
  cache.semanticCompletions.clear()
  completionUI.hide()
  hoverUI.hide()
  hintUI.hide()
  needsUpdate() && updateServer()
})

autocmd.completeDone(async () => {
  g.veonim_completing = 0
  const { word } = await expr(`v:completed_item`)
  harvester.addWord(vim.cwd, vim.file, word)
  g.veonim_completions = []
})

sub('pmenu.select', ix => completionUI.select(ix))
sub('pmenu.hide', () => completionUI.hide())

action('references', async () => {
  const refs = await references({ ...fileInfo(), ...await getVim.position })

  await call.setloclist(0, refs.map(m => ({
    lnum: m.line,
    col: m.column,
    text: m.desc
  })))

  ex('lopen')
  ex('wincmd p')
})

action('definition', async () => {
  const { line, column } = await definition({ ...fileInfo(), ...await getVim.position })
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
  const patches = await rename({ ...fileInfo(), ...await getVim.position, newName })
  // TODO: change other files besides current buffer. using fs operations if not modified?
  patches.forEach(({ operations }) => call.PatchCurrentBuffer(operations))
})

action('hover', async () => {
  const { line, column } = await getVim.position
  const text = await hover({ ...fileInfo(), line, column })
  if (!text) return
  // TODO: get start column of the object (to show popup menu anchored to the beginning of the word)
  const data = await getColorData(text, vim.filetype)
  hoverUI.show({ data, row: vimUI.cursor.row, col: column })
})

action('symbols', async () => {
  const listOfSymbols = await symbols(fileInfo())
  listOfSymbols && symbolsUI.show(listOfSymbols)
})

action('workspace-symbols', async () => {
  const listOfSymbols = await workspaceSymbols(fileInfo())
  listOfSymbols && symbolsUI.show(listOfSymbols)
})
