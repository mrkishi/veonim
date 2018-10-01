import { fullBufferUpdate, partialBufferUpdate } from '../langserv/adapter'
import Worker from '../messaging/worker'
import nvim from '../core/neovim'

export const harvester = Worker('harvester')
export const finder = Worker('buffer-search')

let pauseUpdate = false

export const update = async ({
  lineChange = false,
  bufferOpened = false,
  lines = [],
  name = '',
  filetype = '',
} = {}) => {
  if (pauseUpdate) return

  // TODO: temp hack for fixing vim sessions
  if (lines.length) return fullBufferUpdate({
    filetype,
    cwd: nvim.state.cwd,
    file: name,
    bufferLines: lines,
  } as any, true)

  if (lineChange) partialBufferUpdate({
    ...nvim.state,
    bufferLines: [ await nvim.getCurrentLine() ]
  }, bufferOpened)

  else {
    const buffer = await nvim.current.buffer.getAllLines()
    harvester.call.set(nvim.state.cwd, nvim.state.file, buffer)
    finder.call.set(nvim.state.cwd, nvim.state.file, buffer)
    fullBufferUpdate({ ...nvim.state, bufferLines: buffer }, bufferOpened)
  }
}

finder.on.getVisibleLines(async () => {
  return nvim.current.buffer.getLines(nvim.state.editorTopLine, nvim.state.editorBottomLine)
})

export const pause = () => pauseUpdate = true
export const resume = () => pauseUpdate = false
