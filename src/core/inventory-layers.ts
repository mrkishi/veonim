export enum InventoryLayerKind {
  Jump = 'Jump',
  Debug = 'Debug',
  Buffer = 'Buffer',
  Search = 'Search',
  Window = 'Window',
  Project = 'Project',
  Language = 'Language',
  Instance = 'Instance',
  /** Only available in Veonim DEV builds */
  DEV = 'LOLHAX',
}

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
}

export interface InventoryLayer {
  /** Layer name. Will be formatted and used for Vim command. */
  name: InventoryLayerKind
  /** Key binding to activate this action */
  keybind: string
  /** User friendly description provided in the UI */
  description: string
  /** This layer is only available DEV builds. Default: FALSE */
  devOnly?: boolean
}

const registeredActions = new Set<InventoryAction>()

export const actions = {
  register: (action: InventoryAction) => registeredActions.add(action),
  callAction: () => {},
  getForLayer: (layerKind: InventoryLayerKind) => [...registeredActions]
    .filter(ia => ia.layer === layerKind),
}

// TODO: specify order or order these in desired display order?
export const layers: InventoryLayer[] = [{
  name: InventoryLayerKind.Language,
  keybind: 'l',
  description: 'Language server features',
}, {
  name: InventoryLayerKind.Debug,
  keybind: 'd',
  description: 'Start debugging and debugger controls',
}, {
  name: InventoryLayerKind.Search,
  keybind: 's',
  description: 'Various search functions like grep, etc.',
}, {
  name: InventoryLayerKind.Jump,
  keybind: 'j',
  description: 'Access jump shortcuts',
}, {
  name: InventoryLayerKind.Buffer,
  keybind: 'b',
  description: 'List and jump between buffers',
}, {
  name: InventoryLayerKind.Window,
  keybind: 'w',
  description: 'Resize, split, and swap windows',
}, {
  name: InventoryLayerKind.Project,
  keybind: 'p',
  description: 'Project management',
}, {
  name: InventoryLayerKind.Instance,
  keybind: 'i',
  description: 'Create and switch between multiple Neovim instances',
}, {
  name: InventoryLayerKind.DEV,
  keybind: '\'',
  description: 'if ur seein dis ur an ub3r 1337 h4x0rz',
  devOnly: true,
} ]
