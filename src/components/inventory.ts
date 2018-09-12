import { InputMode, switchInputMode, watchInputMode } from '../core/input'
import * as inventory from '../core/inventory-layers'
import { h, app } from '../ui/uikit'
import nvim from '../core/neovim'

// TODO: show some layers as disabled? like the langserv layer would be disabled if there
// are not language servers started. user can still see options and info, but visually
// it appears non-functional
//
// can provide in layer description that 'this layer requires language server available'
// the provide current status of lang serv. provide links to where to install langextensions

enum InventoryMode { Main, Layer }

const state = {
  layers: [
    {
      kind: 'Search all layer actions',
      keybind: '<Space>',
      description: 'Fuzzy search all layer actions and execute selection',
    },
    ...inventory.layers,
  ],
  visible: false,
  actions: [] as inventory.InventoryAction[],
}

type S = typeof state

const resetState = { visible: false, actions: [] }

const actions = {
  show: () => ({ visible: true }),
  hide: () => resetState,
  setActions: (actions: inventory.InventoryAction[]) => ({ actions }),
}

type A = typeof actions

const mainView = ($: S) => h('div', $.layers.map(m => h('div', [
  ,h('hr')
  ,h('div', m.kind)
  ,h('div', m.keybind)
  ,h('div', m.description)
])))

const layerView = (actions: inventory.InventoryAction[]) => h('div', actions.map(m => h('div', [
  ,h('hr')
  ,h('div', m.name)
  ,h('div', m.keybind)
  ,h('div', m.description)
  ,h('div', m.experimental || false)
])))

const view = ($: S) => h('div', {
  style: {
    display: $.visible ? 'flex' : 'none',
  },
}, [
  ,h('div', 'ur inventory got ninja looted luls')
  ,$.actions.length ? layerView($.actions) : mainView($)
])

const ui = app<S, A>({ name: 'inventory', state, view, actions })

// TODO: how do we support inventory in other modes except normal?
// it shouldn't be that hard to support visual mode, yea?
//
// TODO: i think we should bind this to c-s-p by default. make c-s-p reserved
// for inventory. we try to bind to space if possible, but if user has any
// bindings set to <space> there will always be c-s-p as a fallback.

// TODO: this should be a separate vim command :VeonimInventory
// we should look to see if we need to register any actions that should
// not show up in the UI. perhaps only in the fuzzy search?
nvim.onAction('inventory', async () => {
  const timeoutLength = await nvim.options.timeoutlen
  console.log('timeoutLength', timeoutLength)
  ui.show()

  const layerList = Object.values(inventory.layers)
  const validLayerKeybinds = new Set([...layerList.map(m => m.keybind)])

  const reset = (actionFn?: Function) => {
    stopWatchingInput()
    switchInputMode(InputMode.Vim)
    ui.hide()

    // some actions funcs will switch input modes. need to cleanup our shit
    // and only then call the action callback function.
    //
    if (actionFn) setImmediate(actionFn)
  }
  // TODO: maybe not use InputMode.Motion?
  // i think the idea of multiple custom input modes is to allow
  // user to setup custom keybindings per mode (like vim does nativelly)
  // in the inventory we do not want any rebindings. it must be static
  switchInputMode(InputMode.Motion)

  let captureMode = InventoryMode.Main
  let activeLayerActions: inventory.InventoryAction[]

  const stopWatchingInput = watchInputMode(InputMode.Motion, key => {
    if (key === '<Esc>') return reset()

    if (captureMode === InventoryMode.Main && validLayerKeybinds.has(key)) {
      const activeLayer = layerList.find(m => m.keybind === key) as inventory.InventoryLayer
      activeLayerActions = inventory.actions.getActionsForLayer(activeLayer.kind)
      captureMode = InventoryMode.Layer
      ui.setActions(activeLayerActions)
      return
    }

    if (captureMode === InventoryMode.Layer) {
      const action = activeLayerActions!.find(m => m.keybind === key)
      // TODO: what do if we select an invalid key?
      if (!action) return reset()

      return reset(action.onAction)
    }

    // TODO: else what do if we selected an invalid key?
  })
})
