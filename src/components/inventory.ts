import { InputMode, switchInputMode, watchInputMode } from '../core/input'
import { InventoryLayer, layers } from '../core/inventory-layers'
import { h, app } from '../ui/uikit'
import nvim from '../core/neovim'

// TODO: show some layers as disabled? like the langserv layer would be disabled if there
// are not language servers started. user can still see options and info, but visually
// it appears non-functional
//
// can provide in layer description that 'this layer requires language server available'
// the provide current status of lang serv. provide links to where to install langextensions

enum InventoryMode { Main, Layer }

interface S {
  layers: InventoryLayer[]
  visible: boolean
  selectedLayer?: InventoryLayer
}

const state: S = {
  layers: Object.values(layers),
  visible: false,
  selectedLayer: undefined,
}

const resetState = { visible: false }

const actions = {
  show: () => ({ visible: true }),
  hide: () => resetState,
}

type A = typeof actions

const mainView = ($: S) => h('div', $.layers.map(m => h('div', [
  ,h('hr')
  ,h('div', m.name)
  ,h('div', m.keybind)
  ,h('div', m.description)
])))

const layerView = ($: S) => h('div', [
  ,h('u selected...')
])

const view = ($: S) => h('div', {
  style: {
    display: $.visible ? 'flex' : 'none',
  },
}, [
  ,h('div', 'ur inventory got ninja looted luls')
  ,$.selectedLayer ? layerView($) : mainView($)
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
      return
    }

    if (captureMode === InventoryMode.Layer) {
      console.log('execute layer action:', key)
      return reset()
    }

    // TODO: else what do if we selected an invalid key?
  })
})
