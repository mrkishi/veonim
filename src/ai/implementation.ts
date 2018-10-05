import { supports } from '../langserv/server-features'
import { implementation } from '../langserv/adapter'
import nvim from '../core/neovim'

nvim.onAction('implementation', async () => {
  if (!supports.implementation(nvim.state.cwd, nvim.state.filetype)) return

  const { path, line, column } = await implementation(nvim.state)
  if (!line || !column) return
  nvim.jumpTo({ path, line, column })
})
