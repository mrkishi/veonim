import Worker from '../messaging/worker'
import nvim from '../core/neovim'

export const harvester = Worker('harvester')
export const finder = Worker('buffer-search')

finder.on.getVisibleLines(async () => {
  return nvim.current.buffer.getLines(nvim.state.editorTopLine, nvim.state.editorBottomLine)
})
