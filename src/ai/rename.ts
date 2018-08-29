import { feedkeys, action, until, expr, applyPatches } from '../core/neovim'
import { supports } from '../langserv/server-features'
import * as updateService from '../ai/update-server'
import { rename } from '../langserv/adapter'
import vim from '../neovim/state'

// TODO: anyway to improve the glitchiness of undo/apply edit? any way to also pause render in undo
// or maybe figure out how to diff based on the partial modification
// call atomic? tricky with getting target lines for replacements
// even if done before atomic operations, line numbers could be off
action('rename', async () => {
  if (!supports.rename(vim.cwd, vim.filetype)) return

  updateService.pause()
  const editPosition = { line: vim.line, column: vim.column }
  feedkeys('ciw')
  await until.insertLeave
  const newName = await expr('@.')
  feedkeys('u')
  updateService.resume()

  applyPatches(await rename({ ...vim, ...editPosition, newName }))
})
