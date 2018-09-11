import { InventoryLayer, InventoryAction, layers, getActionsForLayer } from '../core/inventory-layers'
import { InputMode, switchInputMode, watchInputMode } from '../core/input'
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
  layers: Object.values(layers),
  visible: false,
  actions: [] as InventoryAction[],
}

type S = typeof state

const resetState = { visible: false, selectedLayer: undefined }

const actions = {
  show: () => ({ visible: true }),
  hide: () => resetState,
  setLayer: (layer: InventoryLayer) => ({ selectedLayer: layer }),
}

type A = typeof actions

const mainView = ($: S) => h('div', $.layers.map(l => h('div', [
  ,h('hr')
  ,h('div', l.name)
  ,h('div', l.keybind)
  ,h('div', l.description)
])))

const layerView = (actions: InventoryAction[]) => h('div', actions.map(a => h('div', [
  ,h('hr')
  ,h('div', a.name)
  ,h('div', a.keybind)
  ,h('div', a.description)
  ,h('div', a.experimental || false)
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

nvim.onAction('inventory', async () => {
  const timeoutLength = await nvim.options.timeoutlen
  console.log('timeoutLength', timeoutLength)
  ui.show()

  const layerList = Object.values(layers)
  const validLayerKeybinds = new Set([...layerList.map(m => m.keybind)])

  const reset = () => {
    stopWatchingInput()
    switchInputMode(InputMode.Vim)
    ui.hide()
  }
  // TODO: maybe not use InputMode.Motion?
  // i think the idea of multiple custom input modes is to allow
  // user to setup custom keybindings per mode (like vim does nativelly)
  // in the inventory we do not want any rebindings. it must be static
  switchInputMode(InputMode.Motion)

  let captureMode = InventoryMode.Main
  let activeLayer: InventoryLayer

  const stopWatchingInput = watchInputMode(InputMode.Motion, key => {
    if (key === '<Esc>') return reset()

    if (captureMode === InventoryMode.Main && validLayerKeybinds.has(key)) {
      console.log('switch to layer:', key)
      activeLayer = layerList.find(m => m.keybind === key) as InventoryLayer
      captureMode = InventoryMode.Layer
      ui.setLayer(activeLayer)
      return
    }

    if (captureMode === InventoryMode.Layer) {
      console.log('execute layer action:', key)
      return reset()
    }

    // TODO: else what do if we selected an invalid key?
    console.error(key, 'does not do anything... how do we handle this for the user???')
  })
})
