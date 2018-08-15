import { promisify as P } from 'util'
import { EventEmitter } from 'events'
import { join } from 'path'
import * as fs from 'fs'

const watchers = new EventEmitter()
const watchedParentPaths = new Map<string, string>()

const emptyStat = { isSymbolicLink: () => false }
const getFSStat = async (path: string) => P(fs.lstat)(path).catch((_) => emptyStat)

const getRealPath = async (path: string) => {
  const stat = await getFSStat(path)
  const isSymbolicLink = stat.isSymbolicLink()
  if (!isSymbolicLink) return path
  return P(fs.readlink)(path)
}

const watchDir = (path: string) => fs.watch(path, ((_, file) => {
  const fullpath = join(path, file)
  watchers.emit(fullpath)
}))

export const watchFile = async (path: string, callback: () => void) => {
  console.log('watching file:', path)
  const realpath = await getRealPath(path)
  console.log('realpath', realpath)
  const parentPath = join(realpath, '../')
  watchers.on(realpath, callback)
  if (!watchedParentPaths.has(parentPath)) watchDir(parentPath)
}

watchFile('/Users/a/.config/nvim/init.vim', () => {
  console.log('CONFIG FILE CHANGED LOL!')
})
