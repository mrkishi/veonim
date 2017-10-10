import { fullBufferUpdate, partialBufferUpdate, references, definition, rename, signatureHelp, hover, symbols, workspaceSymbols } from './langserv/adapter'
import { ex, action, autocmd, until, cwdir, call, expr, getCurrentLine, feedkeys } from './ui/neovim'
import * as harvester from './ui/plugins/keyword-harvester'
import * as symbolsUI from './ui/plugins/symbols'
import * as hoverUI from './ui/plugins/hover'
import { cc, debounce, merge } from './utils'
import vimUI from './ui/canvasgrid'

let pauseUpdate = false
interface Cache { startIndex: number, completionItems: string[], filetype: string, file: string, revision: number, cwd: string }
export const cache: Cache = { filetype: '', file: '', revision: -1, cwd: '', startIndex: 0, completionItems: [] }

const fileInfo = () => {
  const { cwd, file, filetype, revision } = cache
  return { cwd, file, filetype, revision }
}

const updateServer = async (lineChange = false) => {
  // TODO: better, more async
  const [ , line, column ] = await call.getpos('.')

  if (lineChange) partialBufferUpdate({
    ...fileInfo(),
    line,
    column,
    buffer: [ await getCurrentLine() ]
  })

  else {
    // TODO: buffer.getLines api built-in
    const buffer = await call.getline(1, '$') as string[]
    harvester.update(cache.cwd, cache.file, buffer)
    fullBufferUpdate({ ...fileInfo(), line, column, buffer })
  }
}

const attemptUpdate = async (lineChange = false) => {
  if (pauseUpdate) return
  // TODO: buffer.changedtick api built-in
  const chg = await expr('b:changedtick')
  if (chg > cache.revision) updateServer(lineChange)
  cache.revision = chg
}

autocmd.bufEnter(debounce(async () => {
  const [ cwd, file, filetype ] = await cc(cwdir(), call.expand(`%f`), expr(`&filetype`))
  // TODO: changedtick -> revision
  merge(cache, { cwd, file, filetype, revision: -1 })
  updateServer()
}, 100))

autocmd.textChanged(debounce(() => attemptUpdate(), 200))
autocmd.textChangedI(() => attemptUpdate(true))
autocmd.insertLeave(() => !pauseUpdate && updateServer())

action('references', async () => {
  const [ , line, column ] = await call.getpos('.')
  const refs = await references({ ...fileInfo(), line, column })

  await call.setloclist(0, refs.map(m => ({
    lnum: m.line,
    col: m.column,
    text: m.desc
  })))

  ex('lopen')
  ex('wincmd p')
})

action('definition', async () => {
  const [ , line, column ] = await call.getpos('.')
  const loc = await definition({ ...fileInfo(), line, column })
  if (!loc || !loc.line || !loc.column) return
  await call.cursor(loc.line, loc.column)
})

action('rename', async () => {
  const [ , line, column ] = await call.getpos('.')
  pauseUpdate = true
  await feedkeys('ciw')
  await until.insertLeave()
  const newName = await expr('@.')
  await feedkeys('u')
  pauseUpdate = false
  const patches = await rename({ ...fileInfo(), line, column, newName })
  // TODO: change other files besides current buffer. using fs operations if not modified?
  patches.forEach(({ operations }) => call.PatchCurrentBuffer(operations))
})

action('hover', async () => {
  const [ , line, column ] = await call.getpos('.')
  const html = await hover({ ...fileInfo(), line, column })
  // TODO: get start column of the object
  // TODO: if multi-line html, anchor from bottom
  const y = vimUI.rowToY(vimUI.cursor.row - 1)
  const x = vimUI.colToX(column)
  hoverUI.show({ html, x, y })
})

autocmd.cursorMoved(() => hoverUI.hide())
autocmd.cursorMovedI(() => hoverUI.hide())

// TODO: this will be auto-triggered. get triggerChars from server.canDo
// TODO: try to figure out if we are inside func call? too much work? (so this func is not called when outside func)
action('signature-help', async () => {
  const [ , line, column ] = await call.getpos('.')
  const hint = await signatureHelp({ ...fileInfo(), line, column })
  if (!hint.signatures.length) return
  // TODO: support list of signatures
  const { label } = hint.signatures[0]
  const y = vimUI.rowToY(vimUI.cursor.row - 1)
  const x = vimUI.colToX(column)
  hoverUI.show({ html: label, x, y })
  // TODO: highlight params
})

action('symbols', async () => {
  const listOfSymbols = await symbols(fileInfo())
  listOfSymbols && symbolsUI.show(listOfSymbols)
})

action('workspace-symbols', async () => {
  const listOfSymbols = await workspaceSymbols(fileInfo())
  listOfSymbols && symbolsUI.show(listOfSymbols)
})
