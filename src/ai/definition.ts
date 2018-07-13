import { action, current as vim, jumpTo } from '../core/neovim'
import { definition } from '../langserv/adapter'
import { supports } from '../langserv/server-features'

action('definition', async () => {
  if (!supports.definition(vim.cwd, vim.filetype)) return

  const { path, line, column } = await definition(vim)
  if (!line || !column) return
  jumpTo({ path, line, column })
})
