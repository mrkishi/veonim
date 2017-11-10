import { definition } from '../langserv/adapter'
import { action, call } from '../ui/neovim'
import { fileInfo } from '../ai'

action('definition', async () => {
  const { line, column } = await definition({ ...fileInfo() })
  if (!line || !column) return
  await call.cursor(line, column)
})
