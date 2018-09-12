import { InventoryLayerKind } from '../core/inventory-layers'
import { supports } from '../langserv/server-features'
import { definition } from '../langserv/adapter'
import nvim from '../core/neovim'

const doDefinition = async () => {
  if (!supports.definition(nvim.state.cwd, nvim.state.filetype)) return

  const { path, line, column } = await definition(nvim.state)
  if (!line || !column) return
  nvim.jumpTo({ path, line, column })
}

nvim.onAction('definition', doDefinition)

nvim.registerAction({
  layer: InventoryLayerKind.Language,
  keybind: 'd',
  name: 'Definition',
  description: 'Go to symbol definition',
  onAction: doDefinition,
})
