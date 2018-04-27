import { Folder as FolderIcon } from 'hyperapp-feather'
import { pascalCase } from '../support/utils'
import { basename, extname } from 'path'
import * as Icons from 'hyperapp-seti'
import { h } from '../ui/uikit'

const getIcon = (path = '') => {
  const filename = basename(path)
  const extension = extname(filename).replace(/^\./, '')
  const lookupId = pascalCase(extension || filename)

  return Reflect.get(Icons, lookupId) || Icons.Clock
}

// TODO: need this?
  // style: {
  //   display: 'flex',
  //   alignItems: 'center',
  //   marginLeft: '-2px',
  //   paddingRight: '4px',
  //   fontSize: fontSize || `${canvasContainer.font.size + 4}px`,
  // }

export const Folder = h('div', {
  style: {
    width: '23px',
    paddingLeft: '1px',
  },
}, [
  ,h(FolderIcon)
])

export default (fileTypeOrPath: string) => h('div', {
  style: {
    width: '24px',
    display: 'flex',
    justifyContent: 'center',
  },
}, [
  ,h(getIcon(fileTypeOrPath))
])
