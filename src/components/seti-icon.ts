const { iconDefinitions, fileExtensions, fileNames, languageIds } = require('../assets/seti-icon-theme.json')
import * as canvasContainer from '../core/canvas-container'
import { basename, extname } from 'path'
import { h } from '../ui/uikit2'

const languageIcon = (language: string) => Reflect.get(languageIds, language)
const fileIcon = (path = '') => {
  const filename = basename(path)
  const extension = extname(filename).replace(/^\./, '')
  return (Reflect.get(iconDefinitions, `_${extension}`) ? `_${extension}` : undefined)
    || Reflect.get(fileNames, filename)
    || Reflect.get(fileExtensions, extension)
}

const genIcon = (id: string, fontSize?: string) => h(`.seti-icon.${id}`, {
  style: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: '-2px',
    paddingRight: '4px',
    fontSize: fontSize || `${canvasContainer.font.size + 4}px`,
  }
})

export const id = (id: string, size?: string) => genIcon(`_${id}`, size)
export const file = (path: string, size?: string) => genIcon(fileIcon(path), size)
export const language = (language: string, size?: string) => genIcon(languageIcon(language), size)
