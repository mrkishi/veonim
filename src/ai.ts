import { fullBufferUpdate, partialBufferUpdate, references, definition, rename, signatureHelp, hover, symbols, workspaceSymbols } from './langserv/adapter'
import { g, ex, action, autocmd, until, cwdir, call, expr, feedkeys, current as vim } from './ui/neovim'
import { cc, debounce, merge, hasUpperCase, findIndexRight } from './utils'
import * as harvester from './ui/plugins/keyword-harvester'
import * as completionUI from './ui/plugins/autocomplete'
import * as symbolsUI from './ui/plugins/symbols'
import * as hoverUI from './ui/plugins/hover'
import { filter } from 'fuzzaldrin-plus'
import vimUI from './ui/canvasgrid'
import { sub } from './dispatch'

interface Cache { startIndex: number, completionItems: string[], filetype: string, file: string, revision: number, cwd: string }
export const cache: Cache = { filetype: '', file: '', revision: -1, cwd: '', startIndex: 0, completionItems: [] }
const maxResults = 8
const state = {
  pauseUpdate: false,
  hoverVisible: false,
}

// TODO: get from lang server
const completionTriggers = new Map<string, RegExp>()
// TODO: $$$$ sign, reallY?
completionTriggers.set('javascript', /[^\w\$\-]/)
completionTriggers.set('typescript', /[^\w\$\-]/)

const fileInfo = () => {
  const { cwd, file, filetype, revision } = cache
  return { cwd, file, filetype, revision }
}

const orderCompletions = (m: string[], query: string) =>
  m.slice().sort(a => hasUpperCase(a) ? -1 : a.startsWith(query) ? -1 : 1)

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

const findQuery = (filetype: string, line: string, column: number) => {
  const pattern = completionTriggers.get(filetype) || /[^\w\-]/
  const start = findIndexRight(line, pattern, column - 2) || 0
  const startIndex = start ? start + 1 : 0
  const query = line.slice(startIndex, column - 1) || ''
  const leftChar = line[start]
  // TODO: should startIndex be modified for leftChar?
  return { startIndex, query, leftChar }
}

const updateVim = (items: string[]) => {
  cache.completionItems = items
  g.veonim_completions = items
}

const updateServer = async (lineChange = false) => {
  if (lineChange) {
    const line = await vim.lineContent
    console.log('@@LINE', line)
  }

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

const attemptUpdate = async (lineChange = false) => {
  if (state.pauseUpdate) return
  const currentRevision = await vim.revision
  if (currentRevision > cache.revision) updateServer(lineChange)
  cache.revision = currentRevision
}

const getCompletions = async () => {
  const [ lineContent, { column } ] = await cc(vim.lineContent, vim.position)
  console.log('@@LINE', lineContent)
  const { startIndex, query } = findQuery(cache.filetype, lineContent, column)

  // TODO: if (left char is . or part of the completionTriggers defined per filetype) 
  if (query.length) {
    const words = await harvester.getKeywords(cache.cwd, cache.file)
    if (!words || !words.length) return
    // TODO: call keywords + semantic = combine -> filter against query
    // TODO: call once per startIndex. don't repeat call if startIndex didn't change?
    // TODO: only call this if query has changed 

    // query.toUpperCase() allows the filter engine to rank camel case functions higher
    // aka: saveUserAccount > suave for query: 'sua'
    const completions = filter(words, query.toUpperCase(), { maxResults })

    if (!completions.length) {
      updateVim([])
      completionUI.hide()
      return
    }

    const orderedCompletions = orderCompletions(completions, query)
    updateVim(orderedCompletions)
    const options = orderedCompletions.map((text, id) => ({ id, text }))
    const { x, y } = calcMenuPosition(startIndex, column, options.length)
    completionUI.show({ options, x, y })

    // TODO: do we always need to update this?
    // TODO: cache last position in insert session
    // only update vim if (changed) 
    // use cache - if (same) dont re-ask for keyword/semantic completions from avo
    //if (cache.startIndex !== startIndex) {
    //setVar('veonim_complete_pos', startIndex)
    //ui.show()
    //}
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
const getSignatureHint = async () => {
  const { line, column } = await vim.position
  const hint = await signatureHelp({ ...fileInfo(), line, column })
  if (!hint.signatures.length) return
  // TODO: support list of signatures
  const { label } = hint.signatures[0]
  const y = vimUI.rowToY(vimUI.cursor.row - 1)
  const x = vimUI.colToX(column)
  hoverUI.show({ html: label, x, y })
  state.hoverVisible = true
  // TODO: highlight params
}

autocmd.bufEnter(debounce(async () => {
  const [ cwd, file, filetype, revision ] = await cc(cwdir(), vim.file, vim.filetype, vim.revision)
  merge(cache, { cwd, file, filetype, revision })
  updateServer()
}, 100))

autocmd.textChanged(debounce(() => attemptUpdate(), 200))
autocmd.textChangedI(() => attemptUpdate(true))
autocmd.cursorMoved(() => state.hoverVisible && hoverUI.hide())
autocmd.insertEnter(() => state.hoverVisible && hoverUI.hide())

autocmd.cursorMovedI(() => {
  getCompletions()
  getSignatureHint()
})

autocmd.insertLeave(() => {
  cache.startIndex = 0
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
