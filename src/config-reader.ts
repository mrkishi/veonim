import { log, exists, readFile } from './utils'
const watch = require('node-watch')
import { homedir } from 'os'

export type Config = Map<string, any>
export type ConfigCallback = (config: Config) => void

const $HOME = homedir()
const base = process.env.XDG_CONFIG_HOME || (process.platform === 'win32'
  ? `${$HOME}/AppData/Local`
  : `${$HOME}/.config`)

const loadConfig = async (path: string, notify: ConfigCallback) => {
  const pathExists = await exists(path)
  if (!pathExists) return log `config file at ${path} not found`

  const data = await readFile(path)
  const config = data
    .toString()
    .split('\n')
    .filter((line: string) => /^let g:vn_/.test(line))
    .reduce((map: Config, line: string) => {
      const [ , key = '', dirtyVal = '' ] = line.match(/^let g:vn_(\S+)(?:\s*)\=(?:\s*)([\S\ ]+)/) || []
      const cleanVal = dirtyVal.replace(/^(?:"|')(.*)(?:"|')$/, '$1')
      map.set(key, cleanVal)
      return map
    }, new Map<string, any>())

  notify(config)
}

export const getDefaultConfig = (path = 'nvim/init.vim'): Promise<Map<string, any>> =>
  new Promise(fin => loadConfig(`${base}/${path}`, c => fin(c)))

export default async (location: string, cb: ConfigCallback) => {
  const path = `${base}/${location}`
  const pathExists = await exists(path)
  if (!pathExists) return log `config file at ${path} not found`

  loadConfig(path, cb).catch(e => log(e))
  watch(path, () => loadConfig(path, cb).catch(e => log(e)))
}

export const watchConfig = async (location: string, cb: Function) => {
  const path = `${base}/${location}`
  const pathExists = await exists(path)
  if (!pathExists) return log `config file at ${path} not found`
  watch(path, () => cb())
}
