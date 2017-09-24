import { fullBufferUpdate, partialBufferUpdate, references, definition, rename, signatureHelp } from './langserv/adapter'
import { ex, action, autocmd, until, cwdir, call, expr, getCurrentLine, feedkeys, define } from './ui/neovim'
import { cc, debounce, merge } from './utils'

let pauseUpdate = false
const cache = { filetype: '', file: '', revision: -1, cwd: '' }

define.PatchCurrentBuffer`
  let pos = getcurpos()
  let patch = a:1
  for chg in patch
    if chg.op == 'delete'
      exec chg.line . 'd'
    elseif chg.op == 'replace'
      call setline(chg.line, chg.val)
    elseif chg.op == 'append'
      call append(chg.line, chg.val)
    end
  endfor
  call cursor(pos[1:])
`

const updateServer = async (lineChange = false) => {
  // TODO: better, more async
  const [ , line, column ] = await call.getpos('.')

  if (lineChange) partialBufferUpdate({
    ...cache,
    line,
    column,
    buffer: [ await getCurrentLine() ]
    //buffer: [ await call.getline('.') as string ]
  })

  else fullBufferUpdate({
    ...cache,
    line,
    column,
    // TODO: buffer.getLines api built-in
    buffer: await call.getline(1, '$') as string[]
  })
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
  merge(cache, { cwd, file, filetype, revision: -1 })
  updateServer()
}, 100))

autocmd.textChanged(debounce(() => attemptUpdate(), 200))
autocmd.textChangedI(() => attemptUpdate(true))

action('references', async () => {
  const [ , line, column ] = await call.getpos('.')
  const refs = await references({ ...cache, line, column })

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
  const loc = await definition({ ...cache, line, column })
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
  const patches = await rename({ ...cache, line, column, newName })
  // TODO: change other files besides current buffer
  patches.forEach(({ operations }) => call.PatchCurrentBuffer(operations))
})

action('hint', async () => {
  const [ , line, column ] = await call.getpos('.')
  const hint = await signatureHelp({ ...cache, line, column })
  console.log(hint)
})
