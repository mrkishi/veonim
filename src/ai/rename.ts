import { Buffer, ex, list, feedkeys, action, until, expr, current as vimState } from '../core/neovim'
import * as updateService from '../ai/update-server'
import { rename } from '../langserv/adapter'
import { matchOn } from '../support/utils'
import { Patch } from '../langserv/patch'

interface PathBuf {
  buffer: Buffer,
  path: string,
}

// TODO: anyway to improve the glitchiness of undo/apply edit? any way to also pause render in undo
// or maybe figure out how to diff based on the partial modification
action('rename', async () => {
  updateService.pause()
  await feedkeys('ciw')
  await until.insertLeave
  const newName = await expr('@.')
  await feedkeys('u')
  updateService.resume()
  const patches = await rename({ ...vimState, newName })

  const buffers = await Promise.all((await list.buffers).map(async buffer => ({
    buffer,
    path: await buffer.name,
  })))

  // TODO: this assumes all missing files are in the cwd
  // TODO: badd allows the option of specifying a line number to position the curosr
  // when loading the buffer. might be nice to use on a rename op. see :h badd
  patches
    .filter(p => buffers.some(b => b.path !== p.path))
    .map(b => ex(`badd ${b.file}`))

  applyPatchesToBuffers(patches, buffers)
})

// TODO: maybe this fn should be in common neovim utils or neovim.ts?
const applyPatchesToBuffers = async (patches: Patch[], buffers: PathBuf[]) => buffers.forEach(({ buffer, path }) => {
  const patch = patches.find(p => p.path === path)
  if (!patch) return

  // TODO: should do atomic calls for this?
  // undo is two-stage chunk...

  patch.operations.forEach(({ op, start, end, val }) => matchOn(op)({
    delete: () => buffer.delete(start.line),
    append: () => buffer.append(start.line, val),
    replace: async () => {
      const targetLine = await buffer.getLine(start.line)
      const newLine = targetLine.slice(0, start.character) + val + targetLine.slice(end.character)
      buffer.replace(start.line, newLine)
    }
  }))
})
