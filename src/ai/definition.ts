import { action, current as vimState, jumpTo } from '../core/neovim'
import { definition } from '../langserv/adapter'
import { join } from 'path'

action('definition', async () => {
  // TODO: fix line/column index, as they are now 0-index based
  const { path, line, column } = await definition(vimState)
  if (!line || !column) return
  jumpTo({ path, line, column })
})
