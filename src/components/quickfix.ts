import { DiagnosticSeverity } from 'vscode-languageserver-types'
import { Row, RowHeader, RowGroup } from '../styles/common'
import * as canvasContainer from '../core/canvas-container'
import { h, app, style, Actions } from '../ui/uikit'
import { QuickfixGroup } from '../ai/diagnostics'
import Icon from '../components/icon'

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

const IconBox = style('div')({
  display: 'flex',
  alignItems: 'center',
  paddingRight: '10px',
})

const icons = {
  [DiagnosticSeverity.Error]: Icon('error', {
    color: '#ef2f2f',
    size: canvasContainer.font.size + 4,
  }),
  [DiagnosticSeverity.Warning]: Icon('error', {
    color: '#ffb100',
    size: canvasContainer.font.size + 4,
  })
}

const getSeverityIcon = (severity = 1) => Reflect.get(icons, severity)

const view = ({ problems, vis, ix, subix }: State) => h('#quickfix', {
  style: {
    // TODO: vim colors
    background: '#222',
    color: '#eee',
    display: vis ? 'flex' : 'none',
    flexFlow: 'column',
    position: 'absolute',
    alignSelf: 'flex-end',
    // TODO: enable once we have scrolling implemented
    //maxHeight: '30vh',
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
      // TODO: make this shared - grep needs it also
      style: pos === ix && {
        color: '#fff',
        background: '#5a5a5a',
        fontWeight: 'normal',
      }
    }, [
      ,h('span', file),
      ,h('span', dir),
      ,h('span.bubble', { style: { 'margin-left': '12px' } }, items.length)
    ])

    ,pos === ix && RowGroup({}, items.map(({ severity, message, range }, itemPos) => Row({
      // TODO: how to make this shared
      style: itemPos === subix && {
        background: '#3f3f3f',
        color: '#eee',
        fontWeight: 'bold',
      }
    }, [
      ,IconBox({}, getSeverityIcon(severity))

      ,h('span', message)
      ,h('span', {
        style: { marginLeft: '10px' }
      }, `(${range.start.line}, ${range.start.character})`)
    ])))

  ])))
])

const a: Actions<State> = {}

a.show = () => ({ vis: true })
a.hide = () => ({ vis: false })
a.toggle = s => ({ vis: !s.vis })
a.updateProblems = (_s, _a, problems) => ({ problems })

const ui = app({ state, view, actions: a }, false)

export const hide = () => ui.hide()
export const show = () => ui.show()
export const toggle = () => ui.toggle()
export const update = (problems: QuickfixGroup[]) => ui.updateProblems(problems)
