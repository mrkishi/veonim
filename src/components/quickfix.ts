import { Diagnostic } from 'vscode-languageserver-types'
import { h, app, Actions } from '../ui/uikit'
import { Row } from '../styles/common'

interface State {
  problems: Diagnostic[],
  vis: boolean,
  ix: number,
}

const state: State = {
  problems: [],
  vis: false,
  ix: 0,
}

const view = ({ problems, vis, ix }: State) => h('#quickfix', {
  style: {
    // TODO: vim colors
    background: '#222',
    color: '#eee',
    display: vis ? 'flex' : 'none',
    flexFlow: 'column',
    position: 'absolute',
    alignSelf: 'flex-end',
    maxHeight: '30vh',
    width: '100%',
  }
}, [
  ,h('div', {
    style: {
      paddingLeft: '10px',
      paddingRight: '10px',
      paddingBottom: '8px',
      paddingTop: '8px',
    }
  }, 'Quickfix')

  ,h('div', problems.map((problem, key) => Row({
    key,
    style: key === ix ? { background: 'rgba(255, 255, 255, 0.08)' } : undefined,
  }, [
    h('span', { style: {
      color: key === ix ? '#fff' : '#aaa'
    } }, problem.message)
  ])))
])

const a: Actions<State> = {}

a.hide = () => ({ vis: false })
a.show = (_s, _a, problems) => ({ problems, vis: true })

const ui = app({ state, view, actions: a }, false)

export const show = (problems: Diagnostic[]) => ui.show(problems)
export const hide = () => ui.hide()
