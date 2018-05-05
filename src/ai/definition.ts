import { action, current as vimState, jumpTo } from '../core/neovim'
import { definition } from '../langserv/adapter'

action('definition', async () => {
  const { path, line, column } = await definition(vimState)
  if (!line || !column) return
  jumpTo({ path, line, column })
})
