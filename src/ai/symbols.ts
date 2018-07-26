import { action, current as vimState } from '../core/neovim'
import { show, SymbolMode } from '../components/symbols'
import { symbols } from '../langserv/adapter'

action('symbols', async () => {
  const listOfSymbols = await symbols(vimState)
  listOfSymbols && show(listOfSymbols, SymbolMode.Buffer)
})

action('workspace-symbols', () => show([], SymbolMode.Workspace))
