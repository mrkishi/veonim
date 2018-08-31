import { fullBufferUpdate, partialBufferUpdate } from '../langserv/adapter'
import { getCurrent, current } from '../core/neovim'
import Worker from '../messaging/worker'
import vimState from '../neovim/state'

export const harvester = Worker('harvester')
export const finder = Worker('buffer-search')

let pauseUpdate = false

export const update = async ({ lineChange = false, bufferOpened = false } = {}) => {
  if (pauseUpdate) return

  if (lineChange) partialBufferUpdate({
    ...vimState,
    bufferLines: [ await getCurrent.lineContent ]
  }, bufferOpened)

  else {
    const buffer = await getCurrent.bufferContents
    harvester.call.set(vimState.cwd, vimState.file, buffer)
    finder.call.set(vimState.cwd, vimState.file, buffer)
    fullBufferUpdate({ ...vimState, bufferLines: buffer }, bufferOpened)
  }
}

finder.on.getVisibleLines(async () => {
  return current.buffer.getLines(vimState.editorTopLine, vimState.editorBottomLine)
})

export const pause = () => pauseUpdate = true
export const resume = () => pauseUpdate = false
