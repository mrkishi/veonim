import { configPath } from '../support/utils'
import { homedir } from 'os'
import { join } from 'path'

export const EXT_PATH = join(configPath, 'veonim', 'extensions')

export const explorer = {
  ignore: {
    dirs: ['.git'],
    files: ['.DS_Store'],
  },
  project: {
    root: homedir(),
  }
}

export const workspace = {
  ignore: {
    dirs: ['build', 'dist'],
  }
}

export const colorscheme = 'veonord'
