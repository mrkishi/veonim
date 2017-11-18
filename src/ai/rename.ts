import { feedkeys, call, action, until, expr, current as vimState } from '../ui/neovim'
import { VimPatch, Operation, Patch } from '../langserv/patch'
import * as updateService from './update-server'
import { rename } from '../langserv/adapter'
import { getLine } from '../langserv/files'
import patchFilesOnFS from '../langserv/patch-fs'
import * as path from 'path'

const currentBufferPath = () => path.join(vimState.cwd, vimState.file)

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

  // TODO: how does this work if the buffer is unnamed and not saved to fs?
  const currentBufferPatch = patches
    .filter(({ path }) => path === currentBufferPath())[0]

  // what is the performance impact? otherwise would be simpler code to have 2 methods)
  // - patch current buffer via vimscript fns (actually, why not just use Neovim.Buffer methods?
  // - patch all modified buffers (not saved to FS) via Neovim.Buffer.getLines/setLines
  // TODO: get modified buffers
  const modifiedBuffers: string[] = []

  const fsPatches = patches
    .filter(({ path }) => path !== currentBufferPath() && !modifiedBuffers.includes(path))

  applyPatchToBuffer(currentBufferPatch)
  patchFilesOnFS(fsPatches)
})

const mapVimPatch = ({ cwd, file, operations }: Patch): VimPatch[] => operations.map(({ op, start, end, val }) => {
  const line = start.line + 1

  if (op === Operation.Replace) {
    const targetLine = getLine(cwd, file, line)
    // TODO: does this apply to vim 1-index based lines/chars?
    const newLine = targetLine.slice(0, start.character) + val + targetLine.slice(end.character)
    return { op, line, val: newLine }
  }

  return { op, line, val }
})

const applyPatchToBuffer = (patch: Patch) => {
  const patchOps = mapVimPatch(patch)
  call.PatchCurrentBuffer(patchOps)
}
