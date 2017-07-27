import { createReadStream } from 'fs'
//import { promisify } from 'util'
import { homedir } from 'os'
import { watch } from 'chokidar'
import { debounce } from './utils'

//TODO: check through possible locations if file exists
//const exists = promisify(stat)
// TODO: check if file exists
//const checks = await Promise.all(possibleLocations.map(p => exists(p)))
//const file = checks.find(a => a)
const $HOME = homedir()
// /^(?:"|')(.*)(?:"|')$/.replace($1)

// TODO: $XDG_CONFIG_HOME or $HOME/config
const possibleLocations = [
  `${$HOME}/.config/nvim/init.vim`,
  `${$HOME}/.vimrc`,
]

type Config = Map<string, any>

let userCallback: Function

const loadConfig = () => {
  // TODO: find first
  const path = possibleLocations[0]
  const file = createReadStream(path)

  // TODO: could be multiple buffer parts. use split module?
  file.on('data', (e: Buffer) => {
    const config = e
      .toString()
      .split('\n')
      .filter((line: string) => /^let g:vn_/.test(line))
      .reduce((map: Config, line: string) => {
        const [ , key = '', dirtyVal = '' ] = line.match(/^let g:vn_(\S+)(?:\s*)\=(?:\s*)([\S\ ]+)/) || []
        const cleanVal = dirtyVal.replace(/^(?:"|')(.*)(?:"|')$/, '$1')
        map.set(key, cleanVal)
        return map
      }, new Map() as Config)

    // TODO: should call on 'end' because of multiple parts
    userCallback(config)
  })
}


export default (cb: (config: Map<string, any>) => void) => {
  userCallback = cb
  loadConfig()
  // TODO: again, find the first existing one. should be at load time or dynamically on reload?
  watch(possibleLocations[0]).on('change', debounce(loadConfig, 10))
}
