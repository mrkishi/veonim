import { show, SymbolMode } from '../components/symbols'
import { action, current as vim } from '../core/neovim'
import { supports } from '../langserv/server-features'
import { symbols } from '../langserv/adapter'

action('symbols', async () => {
  if (!supports.symbols(vim.cwd, vim.filetype)) return

  const listOfSymbols = await symbols(vim)
  listOfSymbols && show(listOfSymbols, SymbolMode.Buffer)
})

action('workspace-symbols', () => {
  if (supports.workspaceSymbols(vim.cwd, vim.filetype)) show([], SymbolMode.Workspace)
})
