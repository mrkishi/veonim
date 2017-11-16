import { extname, join } from 'path'
import { readFile } from '../utils'

const files = new Map<string, string[]>()

export const getType = (file: string) => extname(file).replace('.', '')

export const update = (cwd: string, file: string, buffer: string[]) =>
  files.set(join(cwd, file), buffer)

export const getLine = (cwd: string, file: string, line: number) =>
  files.has(join(cwd, file)) ? files.get(join(cwd, file))![line - 1] : ''

export const getFile = async (cwd: string, file: string): Promise<string[]> => {
  const path = join(cwd, file)
  return files.get(path) || (await readFile(path).catch(() => '')).split('\n')
}
