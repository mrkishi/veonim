import { h, app, Actions } from '../uikit'
import { translate } from '../css'

interface State { value: string, vis: boolean, x: number, y: number }
const state: State = { value: '', vis: false, x: 0, y: 0 }

const view = ({ value, vis, x, y }: State) => h('#hover', {
  hide: !vis,
  style: {
    position: 'absolute',
    transform: translate(x, y),
  }
}, [
  h('.hover', value)
])

const a: Actions<State> = {}

a.show = (_s, _a, { value, x, y }) => ({ value, x, y, vis: true })
a.hide = () => ({ vis: false })

const ui = app({ state, view, actions: a }, false)

export const show = ({ x, y, html }: { x: number, y: number, html: string }) => ui.show({ value: html, x, y })
export const hide = () => ui.hide()
