import { Row, RowHeader, RowGroup } from '../styles/common'
import { QuickfixGroup } from '../ai/diagnostics'
import { h, app, Actions } from '../ui/uikit'

interface State {
  problems: QuickfixGroup[],
  vis: boolean,
  ix: number,
  subix: number,
}

const state: State = {
  problems: [],
  vis: false,
  ix: 0,
  subix: 0,
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

  ,h('div', problems.map(({ file, dir, items }, pos) => h('div', [

    ,RowHeader({

    }, [
      ,h('span', file),
      ,h('span', dir),
      ,h('span.bubble', { style: { 'margin-left': '12px' } }, items.length)
    ])

    ,pos === ix && RowGroup({}, items.map((d) => Row({

    }, [
      ,h('span', d.severity)
      ,h('span', d.message)
      ,h('span', `(${d.range.start.line}, ${d.range.start.character})`)
    ])))

  ])))
])

const a: Actions<State> = {}

a.hide = () => ({ vis: false })
a.show = (_s, _a, problems) => ({ problems, vis: true })

const ui = app({ state, view, actions: a }, false)

export const show = (problems: QuickfixGroup[]) => ui.show(problems)
export const hide = () => ui.hide()
