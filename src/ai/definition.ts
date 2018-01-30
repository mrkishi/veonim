import { cmd, feedkeys, action, current as vimState } from '../core/neovim'
import { pathRelativeToCwd } from '../support/utils'
import { definition } from '../langserv/adapter'
import * as path from 'path'

action('definition', async () => {
  const { line, column, cwd, file } = await definition(vimState)
  if (!line || !column) return
  const fullpath = path.join(cwd, file)
  const location = pathRelativeToCwd(fullpath, vimState.cwd)

  cmd(`e ${location}`)
  feedkeys(`${line}Gzz${column}|`)
})
