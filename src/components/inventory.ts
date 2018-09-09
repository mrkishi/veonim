import { h, app } from '../ui/uikit'
import nvim from '../core/neovim'

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

nvim.onAction('inventory', async () => {
  const timeoutLength = await nvim.options.timeoutlen
  console.log('timeoutLength', timeoutLength)
  ui.show()
})
