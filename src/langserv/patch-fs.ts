import { readFile, writeFile, matchOn } from '../utils'
import { Patch, PatchOperation } from './adapter'
import { join } from 'path'

// TODO: this module should probably be a worker
const patch = (lines: string[], operations: PatchOperation[]): string[] => {
  // heavy operation - so splice maybe more efficient instead of immutable
  operations
    .sort((a, b) => b.line - a.line)
    .forEach(({ op, line, val = '' }) => matchOn(op)({
      delete: () => lines.splice(line, 1),
      append: () => lines.splice(line + 1, 0, val),
      replace: () => lines.splice(line, 1, val),
    }))

  return lines
}

const applyPatch = (path: string, lines: string[]): Promise<boolean> => writeFile(path, lines.join('\n'))

export default async (patches: Patch[]): Promise<boolean> => {
  const res = patches.map(async ({ cwd, file, operations }) => {
    const path = join(cwd, file)
    // TODO: so when generating a patch, the logic tries to fill out the 'replace' val
    // by reading the file from the fs. that means 2x read file ops will be done (or even more
    // if same file is read multiple times in file service)
    const lines = (await readFile(path).catch(() => '')).split('\n')
    const modifiedLines = patch(lines, operations)
    return applyPatch(path, modifiedLines)
  })

  return (await Promise.all(res)).every(m => m)
}
