import { sub } from '../messaging/dispatch'
import { cursor } from '../core/cursor'
import { h, app } from '../ui/uikit'

const state = {
  visible: false,
  content: '',
}

type S = typeof state

const actions = {
  show: (msg: string) => {
    return ({ content: msg, visible: true })
  },
  hide: () => (s: S) => {
    if (s.visible) return { visible: false, content: '' }
  },
}

const view = ($: S) => h('div', {
  style: {
    display: $.visible ? 'flex' : 'none',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    height: '100%',
    width: '100%',
  },
}, [
  ,h('pre', {
    style: {
      background: 'rgba(0, 0, 0, 0.8)',
      padding: '10px',
      color: '#fff',
    }
  }, $.content)
])

const ui = app<S, typeof actions>({ name: 'spell-check', state, actions, view })

const cursorAt = { row: 0, col: 0 }

sub('msg:spell-check', msg => {
  Object.assign(cursorAt, cursor)
  ui.show(msg)
})

sub('cursor-moved', () => {
  const moveWhenOpen = cursor.row === cursorAt.row && cursor.col === cursorAt.col
  if (moveWhenOpen) ui.hide()
})
