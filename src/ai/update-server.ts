import { current as vimState, getCurrent, current, expr } from '../core/neovim'
import { fullBufferUpdate, partialBufferUpdate } from '../langserv/adapter'
import Worker from '../messaging/worker'

export const harvester = Worker('harvester')
export const finder = Worker('buffer-search')

let pauseUpdate = false

export const update = async ({ lineChange = false, bufferOpened = false } = {}) => {
  if (pauseUpdate) return

  if (lineChange) partialBufferUpdate({
    ...vimState,
    buffer: [ await getCurrent.lineContent ]
  }, bufferOpened)

  else {
    const buffer = await getCurrent.bufferContents
    harvester.call.set(vimState.cwd, vimState.file, buffer)
    finder.call.set(vimState.cwd, vimState.file, buffer)
    fullBufferUpdate({ ...vimState, buffer }, bufferOpened)
  }
}

finder.on.getVisibleLines(async () => {
  const [ start, end ] = await Promise.all([
    expr(`line('w0')`),
    expr(`line('w$')`),
  ])

  return current.buffer.getLines(start, end)
})

export const pause = () => pauseUpdate = true
export const resume = () => pauseUpdate = false
