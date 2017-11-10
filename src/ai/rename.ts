import { feedkeys, call, action, until, expr } from '../ui/neovim'
import * as updateService from './update-server'
import { rename } from '../langserv/adapter'
import { fileInfo } from '../ai'

// TODO: anyway to improve the glitchiness of undo/apply edit? any way to also pause render in undo
// or maybe figure out how to diff based on the partial modification
action('rename', async () => {
  updateService.pause()
  await feedkeys('ciw')
  await until.insertLeave
  const newName = await expr('@.')
  await feedkeys('u')
  updateService.resume()
  const patches = await rename({ ...fileInfo(), newName })
  // TODO: change other files besides current buffer. using fs operations if not modified?
  patches.forEach(({ operations }) => call.PatchCurrentBuffer(operations))
})

