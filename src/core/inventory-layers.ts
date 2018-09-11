export enum InventoryLayerKind {
  Jump = 'jump',
  Debug = 'debug',
  Buffer = 'buffer',
  Search = 'search',
  Window = 'window',
  Project = 'project',
  Language = 'language',
  Instance = 'instance',
  /** Only available in Veonim DEV builds */
  DEV = 'DEV',
}

export interface InventoryAction {
  /** So we don't break backwards compatibility for now */
  legacyDeprecatedCommand: string
  /** Which layer this action belongs to */
  layer: InventoryLayerKind
  /** Key binding to activate this action */
  keybind: string
  /** Action name. Will be formatted and appended to layer name. Final command value would be :Veonim ${layer}-${command}*/ 
  name: string
  /** User friendly description provided in the UI */
  description: string
  /** Indicate to the user that this action is experimental. Default: FALSE */
  experimental?: boolean
}

export interface InventoryLayer {
  /** Layer name. Will be formatted and used for Vim command. */
  name: string
  /** Key binding to activate this action */
  keybind: string
  /** User friendly description provided in the UI */
  description: string
  /** This layer is only available DEV builds. Default: FALSE */
  devOnly?: boolean
}

type Layers = { [key in InventoryLayerKind]: InventoryLayer }

export const layers: Layers = {
  language: {
    name: 'Language',
    keybind: 'l',
    description: 'Language server features',
  },

  debug: {
    name: 'Debug',
    keybind: 'd',
    description: 'Start debugging and debugger controls',
  },

  search: {
    name: 'Search',
    keybind: 's',
    description: 'Various search functions like grep, etc.',
  },

  jump: {
    name: 'Jump',
    keybind: 'j',
    description: 'Access jump shortcuts',
  },

  buffer: {
    name: 'Buffer',
    keybind: 'b',
    description: 'List and jump between buffers',
  },

  window: {
    name: 'Window',
    keybind: 'w',
    description: 'Resize, split, and swap windows',
  },

  project: {
    name: 'Project',
    keybind: 'p',
    description: 'Project management',
  },

  instance: {
    name: 'Instance',
    keybind: 'i',
    description: 'Create and switch between multiple Neovim instances',
  },

  DEV: {
    name: 'LOLHAX',
    keybind: '\'',
    description: 'if ur seein dis ur an ub3r 1337 h4x0rz',
    devOnly: true,
  },
}
