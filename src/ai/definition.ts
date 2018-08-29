import { supports } from '../langserv/server-features'
import { definition } from '../langserv/adapter'
import { action, jumpTo } from '../core/neovim'
import vim from '../neovim/state'

action('definition', async () => {
  if (!supports.definition(vim.cwd, vim.filetype)) return

  const { path, line, column } = await definition(vim)
  if (!line || !column) return
  jumpTo({ path, line, column })
})
