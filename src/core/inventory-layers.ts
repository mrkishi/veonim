export enum InventoryLayerKind {
  Debug = 'debug',
  Buffer = 'buffer',
  Search = 'search',
  Motion = 'motion',
  Window = 'window',
  Project = 'project',
  Language = 'language',
  Instance = 'instance',
  /** Only available in Veonim DEV builds */
  DEV = 'DEV',
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
  /** Indicate to the user that this action is experimental. Default: FALSE */
  experimental?: boolean
}

interface InventoryLayer {
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
  },

  DEV: {
    name: 'LOLHAX',
    keybind: '\'',
    devOnly: true,
  },
}
