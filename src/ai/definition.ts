import { action, call, current as vimState } from '../ui/neovim'
import { definition } from '../langserv/adapter'

action('definition', async () => {
  const { line, column } = await definition(vimState)
  if (!line || !column) return
  await call.cursor(line, column)
})
