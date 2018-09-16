import { InventoryLayerKind } from '../inventory/layers'

export interface InventoryAction {
  /** Which layer this action belongs to */
  layer: InventoryLayerKind
  /** Key binding to activate this action */
  keybind: string
  /** Action name. Will be formatted and appended to layer name. Final command value would be :Veonim ${layer}-${command}*/ 
  name: string
  /** User friendly description provided in the UI */
  description: string
  /** Callback will be executed when this action is selected */
  onAction: () => any
  /** Indicate to the user that this action is experimental. Default: FALSE */
  experimental?: boolean
  /** Hide this action from the inventory menu. Otherwise will show up in the inventory search menu. Default: FALSE */ 
  hidden?: boolean
}

const mod = (modulePath: string, func = 'default') => {
  return require(`../${modulePath}`)[func]
}

// TODO: allow actions to be registered as 'hidden'. these will not be displayed
// in the UI as options, but can be found in the fuzzy search menu. useful for
// some less common actions
const actions: InventoryAction[] = [
  {
    layer: InventoryLayerKind.Project,
    keybind: 'f',
    name: 'Files',
    description: 'Find files in project',
    onAction: mod('components/filesz'),
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
  {
    layer: InventoryLayerKind.Search,
    keybind: 'v',
    name: 'Viewport',
    description: 'Search visible viewport',
    onAction: () => mod('components/viewport-search'),
  },
]

// TODO: register all these actions as neovim commands

const wut = actions[0]
console.log('wut', wut)
wut.onAction()

export default {
  list: () => actions,
  getActionsForLayer: (layerKind: InventoryLayerKind) => actions.filter(m => m.layer === layerKind),
}
