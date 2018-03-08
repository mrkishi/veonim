import { action, current as vimState, jumpTo } from '../core/neovim'
import { definition } from '../langserv/adapter'
import { join } from 'path'

action('definition', async () => {
  const { line, column, cwd, file } = await definition(vimState)
  if (!line || !column) return

  jumpTo({
    line,
    column: column - 1,
    path: join(cwd, file),
  })
})
