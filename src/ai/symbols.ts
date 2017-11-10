import { symbols, workspaceSymbols } from '../langserv/adapter'
import * as symbolsUI from '../ui/plugins/symbols'
import { action } from '../ui/neovim'
import { fileInfo } from '../ai'

action('symbols', async () => {
  const listOfSymbols = await symbols(fileInfo())
  listOfSymbols && symbolsUI.show(listOfSymbols)
})

action('workspace-symbols', async () => {
  const listOfSymbols = await workspaceSymbols(fileInfo())
  listOfSymbols && symbolsUI.show(listOfSymbols)
})
