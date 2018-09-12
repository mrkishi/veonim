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
  kind: InventoryLayerKind
  /** Key binding to activate this action */
  keybind: string
  /** User friendly description provided in the UI */
  description: string
  /** This layer is only available DEV builds. Default: FALSE */
  devOnly?: boolean
}

const registeredActions = new Set<InventoryAction>()

// TODO: allow actions to be registered as 'hidden'. these will not be displayed
// in the UI as options, but can be found in the fuzzy search menu. useful for
// some less common actions
export const actions = {
  register: (action: InventoryAction) => registeredActions.add(action),
  callAction: () => {},
  getActionsForLayer: (layerKind: InventoryLayerKind) => [...registeredActions]
    .filter(m => m.layer === layerKind),
}

// TODO: specify order or order these in desired display order?
export const layers: InventoryLayer[] = [{
  kind: InventoryLayerKind.Language,
  keybind: 'l',
  description: 'Language server features',
}, {
  kind: InventoryLayerKind.Debug,
  keybind: 'd',
  description: 'Debug your bugs',
}, {
  kind: InventoryLayerKind.Search,
  keybind: 's',
  description: 'Grep, Viewport, .etc',
}, {
  kind: InventoryLayerKind.Jump,
  keybind: 'j',
  description: 'Access jump shortcuts',
}, {
  kind: InventoryLayerKind.Buffer,
  keybind: 'b',
  description: 'List and jump between buffers',
}, {
  kind: InventoryLayerKind.Window,
  keybind: 'w',
  description: 'Resize, split, and swap windows',
}, {
  kind: InventoryLayerKind.Project,
  keybind: 'p',
  description: 'Project management',
}, {
  kind: InventoryLayerKind.Instance,
  keybind: 'i',
  description: 'Control multiple Neovim instances',
}, {
  kind: InventoryLayerKind.DEV,
  keybind: '\'',
  description: 'if ur seein dis ur an ub3r 1337 h4x0rz',
  devOnly: true,
} ]
