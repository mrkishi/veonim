import { extname } from 'path'

const files = new Map<string, string[]>()

export const getType = (file: string) => extname(file).replace('.', '')
export const getFile = (cwd: string, file: string): string[] => files.get(`${cwd}/${file}`) || []
export const update = (cwd: string, file: string, buffer: string[]) => files.set(`${cwd}/${file}`, buffer)
export const getLine = (cwd: string, file: string, line: number) => files.has(`${cwd}/${file}`) ? files.get(`${cwd}/${file}`)![line - 1] : ''
