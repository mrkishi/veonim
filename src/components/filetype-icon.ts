import { getLanguageForExtension } from '../support/language-ids'
import * as FeatherIcon from 'hyperapp-feather'
import { pascalCase } from '../support/utils'
import { basename, extname } from 'path'
import * as Icons from 'hyperapp-seti'
import { h } from '../ui/uikit'

const findIcon = (id: string) => id && Reflect.get(Icons, pascalCase(id))

const getIcon = (path = '') => {
  const filename = basename(path)
  const extension = extname(filename).replace(/^\./, '')
  const langId = getLanguageForExtension(extension)

  return langId && findIcon(langId)
    || findIcon(extension)
    || findIcon(filename)
    || findIcon(path.toLowerCase())
    || Icons.Shell
}

export const Folder = h('div', {
  style: {
    paddingRight: '6px',
    paddingLeft: '1px',
    fontSize: '1.1rem',
  },
}, [
  ,h(FeatherIcon.Folder)
])

export default (fileTypeOrPath: string) => h('div', {
  style: {
    paddingRight: '6px',
    display: 'flex',
    justifyContent: 'center',
    marginTop: '-2px',
    fontSize: '1.5rem',
    color: '#ccc',
  },
}, [
  ,h(getIcon(fileTypeOrPath))
])
