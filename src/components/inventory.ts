import { layers } from '../core/inventory-layers'
import { h, app } from '../ui/uikit'
import nvim from '../core/neovim'

// TODO: show some layers as disabled? like the langserv layer would be disabled if there
// are not language servers started. user can still see options and info, but visually
// it appears non-functional
//
// can provide in layer description that 'this layer requires language server available'
// the provide current status of lang serv. provide links to where to install langextensions

enum LayerMode { Main, Layer }

const state = {
  layers: Object.values(layers),
  visible: false,
  layerMode: LayerMode.Main,
}

type S = typeof state

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
  ,$.layerMode === LayerMode.Main ? mainView($) : layerView($)
])

const ui = app<S, A>({ name: 'inventory', state, view, actions })

nvim.onAction('inventory', async () => {
  const timeoutLength = await nvim.options.timeoutlen
  console.log('timeoutLength', timeoutLength)
  ui.show()
})
