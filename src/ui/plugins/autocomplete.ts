import { h, app, Actions } from '../uikit'
import { translate } from '../css'

interface CompletionOption { id: number, text: string }
interface State { options: CompletionOption[], vis: boolean, ix: number, x: number, y: number }
interface ShowParams { x: number, y: number, options: CompletionOption[] }

const state: State = { options: [], vis: false, ix: 0, x: 0, y: 0 }

const view = ({ options, vis, ix, x, y }: State) => h('#autocomplete', {
  hide: !vis,
  style: {
    'min-width': '100px',
    'max-width': '300px',
    position: 'absolute',
    transform: translate(x, y),
  }
}, [
  h('div', options.map(({ id, text }) => h('.row.complete', {
    key: id,
    css: { active: id === ix },
  }, [
    h('span', text)
  ])))
])

const a: Actions<State> = {}

a.show = (_s, _a, { options, x, y, ix = -1 }) => ({ options, ix, x, y, vis: true })
a.hide = () => ({ vis: false, ix: 0 })
a.select = (_s, _a, ix: number) => ({ ix })

const ui = app({ state, view, actions: a }, false)

export const show = (params: ShowParams) => ui.show(params)
export const select = (index: number) => ui.select(index)
export const hide = () => ui.hide()
