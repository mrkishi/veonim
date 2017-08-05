import { createReadStream } from 'fs'
const watch = require('node-watch')
import { homedir } from 'os'

export type Config = Map<string, any>
export type ConfigCallback = (config: Config) => void

const $HOME = homedir()
const base = process.env.XDG_CONFIG_HOME || (process.platform === 'win32'
  ? `${$HOME}/AppData/Local`
  : `${$HOME}/.config`)

const loadConfig = async (path: string, notify: ConfigCallback) => {
  const file = createReadStream(path)
  let buf = ''

  file.on('data', (e: Buffer) => buf += e)
  file.on('end', () => {
    const config = buf
      .split('\n')
      .filter((line: string) => /^let g:vn_/.test(line))
      .reduce((map: Config, line: string) => {
        const [ , key = '', dirtyVal = '' ] = line.match(/^let g:vn_(\S+)(?:\s*)\=(?:\s*)([\S\ ]+)/) || []
        const cleanVal = dirtyVal.replace(/^(?:"|')(.*)(?:"|')$/, '$1')
        map.set(key, cleanVal)
        return map
      }, new Map<string, any>())

      notify(config)
  })
}

export default (location: string, cb: ConfigCallback, handleErr: (err: string) => void) => {
  const path = `${base}/${location}`
  loadConfig(path, cb).catch(e => handleErr(e))
  watch(path, () => loadConfig(path, cb).catch(e => handleErr(e)))
}
