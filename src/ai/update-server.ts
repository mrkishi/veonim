import { fullBufferUpdate, partialBufferUpdate } from '../langserv/adapter'
import * as harvester from '../ui/plugins/keyword-harvester'
import { current, getCurrent } from '../ui/neovim'
import { fileInfo } from '../ai'

let pauseUpdate = false

const update = async ({ lineChange = false } = {}) => {
  if (pauseUpdate) return

  if (lineChange) partialBufferUpdate({
    ...fileInfo(),
    buffer: [ await getCurrent.lineContent ]
  })

  else {
    const buffer = await getCurrent.bufferContents
    harvester.update(current.cwd, current.file, buffer)
    fullBufferUpdate({ ...fileInfo(), buffer })
  }
}

const pause = () => pauseUpdate = true
const resume = () => pauseUpdate = false

export { update, pause, resume }
