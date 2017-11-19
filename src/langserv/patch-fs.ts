import { readFile, writeFile, matchOn } from '../utils'
import { Patch, PatchOperation } from './patch'

// TODO: this module should probably be a worker
// TODO: this module should probably be a worker
// TODO: this module should probably be a worker
// TODO: this module should probably be a worker

const patch = (lines: string[], operations: PatchOperation[]): string[] => {
  // heavy operation - so splice maybe more efficient instead of immutable
  operations
    .sort((a, b) => b.start.line - a.end.line)
    .forEach(({ op, start, end, val = '' }) => matchOn(op)({
      delete: () => lines.splice(start.line, 1),
      append: () => lines.splice(start.line + 1, 0, val),
      replace: () => {
      // TODO: does this apply correctly for 0-index based operations?
        const targetLine = lines[start.line]
        const newLine = targetLine.slice(0, start.character) + val + targetLine.slice(end.character)
        lines.splice(start.line, 1, newLine)
      },
    }))

  return lines
}

const applyPatch = (path: string, lines: string[]): Promise<boolean> => writeFile(path, lines.join('\n'))

const patchFiles = async (patches: Patch[]): Promise<boolean> => {
  const res = patches.map(async ({ path, operations }) => {
    const lines = (await readFile(path).catch(() => '') as string).split('\n')
    const modifiedLines = patch(lines, operations)
    return applyPatch(path, modifiedLines)
  })

  return (await Promise.all(res)).every(m => m)
}

export default async (patches: Patch[]): Promise<boolean> => patchFiles(patches)
