import { watchConfig } from '../config/config-reader'
import { h, app } from '../ui/uikit'
import nvim from '../core/neovim'

// TODO: probably move to a separate module - config reader to handle vim options?
// const vimOptions = (() => {
//   let timeoutlen = 1000

//   nvim
//     .getOption('timeoutlen')
//     .then(time => timeoutlen = time)
//     .catch(() => {})

//   return {
//     get timeoutLength() { return timeoutlen }
//   }
// })()

const state = {
  visible: false,
}

type S = typeof state

const resetState = { visible: false }

const actions = {
  show: () => ({ visible: true }),
  hide: () => resetState,
}

type A = typeof actions

const view = ($: S) => h('div', {
  style: {
    display: $.visible ? 'flex' : 'none',
  },
}, [
  ,h('div', 'ur inventory got ninja looted luls')
])

const ui = app<S, A>({ name: 'inventory', state, view, actions })

nvim.onAction('inventory', () => {
  ui.show()
})
