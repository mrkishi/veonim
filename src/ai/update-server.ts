import { fullBufferUpdate, partialBufferUpdate } from '../langserv/adapter'
import { current as vimState, getCurrent } from '../core/neovim'
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

export const pause = () => pauseUpdate = true
export const resume = () => pauseUpdate = false
