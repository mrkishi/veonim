import { symbols, workspaceSymbols } from '../langserv/adapter'
import { action, current as vimState } from '../core/neovim'
import * as symbolsUI from '../components/symbols'

action('symbols', async () => {
  const listOfSymbols = await symbols(vimState)
  listOfSymbols && symbolsUI.show(listOfSymbols)
})

action('workspace-symbols', async () => {
  const listOfSymbols = await workspaceSymbols(vimState)
  listOfSymbols && symbolsUI.show(listOfSymbols)
})
