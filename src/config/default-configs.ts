import { configPath } from '../support/utils'
import { homedir } from 'os'
import { join } from 'path'

export const EXT_PATH = join(configPath, 'veonim', 'extensions')

export const project = {
  root: homedir(),
}

export const explorer = {
  ignore: {
    dirs: ['.git'],
    files: ['.DS_Store'],
  },
}

export const workspace = {
  ignore: {
    dirs: ['build', 'dist'],
  }
}

export const colorscheme = 'brunswick'
