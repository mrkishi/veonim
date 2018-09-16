import * as inventory from '../core/inventory-layers'
import { registerShortcut } from '../core/input'
import { VimMode } from '../neovim/types'
import { h, app } from '../ui/uikit'
import nvim from '../core/neovim'

const state = {
  visible: false,
  actions: [] as inventory.InventoryAction[],
}

type S = typeof state

const actions = {
  show: () => ({ visible: true }),
  hide: () => ({ visible: false, actions: [] }),
}

type A = typeof actions

const view = ($: S) => h('div', [

])

const ui = app<S, A>({ name: 'inventory-search', state, actions, view })



const doInventorySearch = () => {
  console.warn('NYI: inventory search')
  const actions = inventory.actions.list()

  // TODO: ui render fuzzy menu of all layer actions kthx
}

nvim.onAction('inventory-search', doInventorySearch)
registerShortcut('s-c-p', VimMode.Normal, doInventorySearch)
