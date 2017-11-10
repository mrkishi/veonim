import { fullBufferUpdate, partialBufferUpdate } from '../langserv/adapter'
import * as harvester from '../ui/plugins/keyword-harvester'
import { current as vimState, getCurrent } from '../ui/neovim'

let pauseUpdate = false

const update = async ({ lineChange = false } = {}) => {
  if (pauseUpdate) return

  if (lineChange) partialBufferUpdate({
    ...vimState,
    buffer: [ await getCurrent.lineContent ]
  })

  else {
    const buffer = await getCurrent.bufferContents
    harvester.update(vimState.cwd, vimState.file, buffer)
    fullBufferUpdate({ ...vimState, buffer })
  }
}

const pause = () => pauseUpdate = true
const resume = () => pauseUpdate = false

export { update, pause, resume }
