import { extname, join } from 'path'
import { readFile } from '../utils'

// TODO: i feel like this is the wrong approach (to store all these cached files)
// there are a few problems. first of all, there is no mechanism to update the files
// in this cache when the files are changed outside vim. i mean we could register
// file watchers, but the other problem is:
//
// no way to remove files from cache. user could go through hundreds of files, all
// being added to the cache and using up memory. with file watchers, there would be
// even more resources tied up.
//
// what was the point of this module?
// if i remember correctly - the point was to allow partial updates to be made much easier
// than calling for entire buffer on every change.
//
// thus maybe this module should only store the current file.
// bufEnter -> add buf lines
// bufEnter -> remove previous, add new buf lines


// TODO: actually i see another use case... modified buffers. can't find them on the FS, and
// if we perform a 'rename' modification, the patches should be applied to modified buffers.
// so either we store cache ro we use the neovim Buffers.getLines/setLines methods for
// modifying buf
const files = new Map<string, string[]>()

// TODO: i wonder what happens if a buffer is modified outside of vim
// although vim can read FS changes, this file cache does not get updated
// until BufEnter (user visits buffer)
export const getType = (file: string) => extname(file).replace('.', '')

export const update = (cwd: string, file: string, buffer: string[]) =>
  files.set(join(cwd, file), buffer)

export const getLine = (cwd: string, file: string, line: number) =>
  files.has(join(cwd, file)) ? files.get(join(cwd, file))![line - 1] : ''

export const getFile = async (cwd: string, file: string): Promise<string[]> => {
  const path = join(cwd, file)
  // TODO: could read the same file multiple times -- should cache (or defer to patch-fs module)
  return files.get(path) || (await readFile(path).catch(() => '')).split('\n')
}
