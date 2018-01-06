import { feedkeys, action, until, expr, current as vimState, applyPatches } from '../core/neovim'
import * as updateService from '../ai/update-server'
import { rename } from '../langserv/adapter'


// TODO: anyway to improve the glitchiness of undo/apply edit? any way to also pause render in undo
// or maybe figure out how to diff based on the partial modification
// call atomic? tricky with getting target lines for replacements
// even if done before atomic operations, line numbers could be off
action('rename', async () => {
  updateService.pause()
  await feedkeys('ciw')
  await until.insertLeave
  const newName = await expr('@.')
  await feedkeys('u')
  updateService.resume()
  applyPatches(await rename({ ...vimState, newName }))
})
