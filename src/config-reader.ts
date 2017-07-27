import { createReadStream } from 'fs'
import { debounce } from './utils'
import { watch } from 'chokidar'
import { homedir } from 'os'

type Config = Map<string, any>

const $HOME = homedir()
const base = process.env.XDG_CONFIG_HOME || (process.platform === 'win32'
  ? `${$HOME}/AppData/Local`
  : `${$HOME}/.config`)

const loadConfig = async (path: string, notify: Function) => {
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
      }, new Map() as Config)

      notify(config)
  })
}

export default (location: string, cb: (config: Config) => void) => {
  const path = `${base}/${location}`
  loadConfig(path, cb).catch(e => console.log(e))
  watch(path).on('change', debounce(() => loadConfig(path, cb), 10))
}
