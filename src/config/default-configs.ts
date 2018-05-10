import { configPath } from '../support/utils'
import { homedir } from 'os'
import { join } from 'path'

export const EXT_PATH = join(configPath, 'veonim', 'extensions')

export const vscodeExtUrl = (author: string, name: string, version = 'latest') => `https://${author}.gallery.vsassets.io/_apis/public/gallery/publisher/${author}/extension/${name}/${version}/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage`

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
