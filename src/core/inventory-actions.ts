import { InventoryAction, InventoryLayerKind } from '../core/inventory-layers'

const mod = (modulePath: string, func = 'default') => {
  return require(`../${modulePath}`)[func]
}

const actions: InventoryAction[] = [
  {
    layer: InventoryLayerKind.Project,
    keybind: 'f',
    name: 'Files',
    description: 'Find files in project',
    onAction: mod('components/files'),
  },
  {
    layer: InventoryLayerKind.Project,
    keybind: 's',
    name: 'Spawn Instance',
    description: 'Spawn Neovim instance with project',
    onAction: mod('components/change-project', 'createInstanceWithDir'),
  },
  {
    layer: InventoryLayerKind.Instance,
    keybind: 'p',
    name: 'Create Project',
    description: 'Create Neovim instance with project',
    onAction: () => mod('components/change-project', 'createInstanceWithDir'),
  },
  {
    layer: InventoryLayerKind.Project,
    keybind: 'c',
    name: 'Change',
    description: 'Change project directory',
    onAction: () => mod('components/change-project', 'changeDir'),
  },
]

// TODO: register all these actions as neovim commands

export default {
  list: () => actions,
  getActionsForLayer: (layerKind: InventoryLayerKind) => actions.filter(m => m.layer === layerKind),
}
