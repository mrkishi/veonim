import { InventoryLayerKind } from '../core/inventory-layers'
import { show, SymbolMode } from '../components/symbols'
import { supports } from '../langserv/server-features'
import { symbols } from '../langserv/adapter'
import nvim from '../core/neovim'

const doSymbols = async () => {
  if (!supports.symbols(nvim.state.cwd, nvim.state.filetype)) return

  const listOfSymbols = await symbols(nvim.state)
  listOfSymbols && show(listOfSymbols, SymbolMode.Buffer)
}

const doWorkspaceSymbols = () => {
  if (supports.workspaceSymbols(nvim.state.cwd, nvim.state.filetype)) show([], SymbolMode.Workspace)
}

nvim.onAction('symbols', doSymbols)
nvim.onAction('workspace-symbols', doWorkspaceSymbols)

nvim.registerAction({
  layer: InventoryLayerKind.Language,
  keybind: 's',
  name: 'Symbols',
  description: 'List symbols for current file',
  onAction: doSymbols,
})

nvim.registerAction({
  layer: InventoryLayerKind.Language,
  keybind: 'w',
  name: 'Workspace Symbols',
  description: 'List symbols for all files',
  onAction: doWorkspaceSymbols,
})
