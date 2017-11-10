import { symbols, workspaceSymbols } from '../langserv/adapter'
import * as symbolsUI from '../ui/plugins/symbols'
import { action, current as vimState } from '../ui/neovim'

action('symbols', async () => {
  const listOfSymbols = await symbols(vimState)
  listOfSymbols && symbolsUI.show(listOfSymbols)
})

action('workspace-symbols', async () => {
  const listOfSymbols = await workspaceSymbols(vimState)
  listOfSymbols && symbolsUI.show(listOfSymbols)
})
