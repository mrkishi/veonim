import { fullBufferUpdate, partialBufferUpdate } from '../langserv/adapter'
import { current as vimState, getCurrent } from '../core/neovim'
import Worker from '../messaging/worker'

export const harvester = Worker('harvester')
let pauseUpdate = false

const update = async ({ lineChange = false } = {}) => {
  if (pauseUpdate) return

  if (lineChange) partialBufferUpdate({
    ...vimState,
    buffer: [ await getCurrent.lineContent ]
  })

  else {
    const buffer = await getCurrent.bufferContents
    harvester.call.set(vimState.cwd, vimState.file, buffer)
    fullBufferUpdate({ ...vimState, buffer })
  }
}

const pause = () => pauseUpdate = true
const resume = () => pauseUpdate = false

export { update, pause, resume }
