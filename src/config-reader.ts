import { homedir } from 'os'
import { createReadStream, stat } from 'fs'
import { promisify } from 'util'

const exists = promisify(stat)
const $HOME = homedir()
// $XDG_CONFIG_HOME or $HOME/config
// /^(?:"|')(.*)(?:"|')$/.replace($1)

const possibleLocations = [
  `${$HOME}/.config/nvim/init.vim`,
  `${$HOME}/.vimrc`,
]
// TODO: chokidar

export default async () => {
  // TODO: check if file exists
  const checks = await Promise.all(possibleLocations.map(p => exists(p)))
  const file = checks.find(a => a)
  const f = createReadStream(file)
  f.on('data', (m: Buffer) => {
    const config = m
      .toString()
      .split('\n')
      .filter(line => line.match(''))

    return config
  })
}