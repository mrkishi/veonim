import { supports } from '../langserv/server-features'
import * as updateService from '../ai/update-server'
import { rename } from '../langserv/adapter'
import nvim from '../core/neovim'

// TODO: anyway to improve the glitchiness of undo/apply edit? any way to also pause render in undo
// or maybe figure out how to diff based on the partial modification
// call atomic? tricky with getting target lines for replacements
// even if done before atomic operations, line numbers could be off
const doRename = async () => {
  if (!supports.rename(nvim.state.cwd, nvim.state.filetype)) return

  updateService.pause()
  const editPosition = { line: nvim.state.line, column: nvim.state.column }
  nvim.feedkeys('ciw')
  await nvim.untilEvent.insertLeave
  const newName = await nvim.expr('@.')
  nvim.feedkeys('u')
  updateService.resume()

  nvim.applyPatches(await rename({ ...nvim.state, ...editPosition, newName }))
}

nvim.onAction('rename', doRename)
export default doRename
