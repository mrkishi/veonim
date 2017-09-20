import { fullBufferUpdate, partialBufferUpdate } from './langserv/adapter'
import { autocmd, cwdir, call, expr, getCurrentLine } from './ui/neovim'
import { cc, debounce, merge } from './utils'

// TODO: when renaming and such
let pauseUpdate = false
const cache = { filetype: '', file: '', revision: -1, cwd: '' }

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
