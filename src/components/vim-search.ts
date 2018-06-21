import { hideCursor, showCursor, disableCursor, enableCursor } from '../core/cursor'
import { CommandType, CommandUpdate } from '../core/render'
import { currentWindowElement } from '../core/windows'
import Input from '../components/text-input'
import { sub } from '../messaging/dispatch'
import { rgba, paddingV } from '../ui/css'
import * as Icon from 'hyperapp-feather'
import { is } from '../support/utils'
import { makel } from '../ui/vanilla'
import { app, h } from '../ui/uikit'

const state = {
  value: '',
  position: 0,
  kind: CommandType.Ex,
}

type S = typeof state

const actions = {
  show: () => {
    hideCursor()
    disableCursor()
    currentWindowElement.add(containerEl)
  },
  hide: () => {
    enableCursor()
    showCursor()
    currentWindowElement.remove(containerEl)
    return { value: '' }
  },
  updateQuery: ({ cmd, kind, position }: CommandUpdate) => (s: S) => ({
    kind,
    position,
    value: is.string(cmd) && s.value !== cmd
    ? cmd
    : s.value
  }),
}

type A = typeof actions

const printCommandType = (kind: CommandType) => {
  if (kind === CommandType.SearchForward) return 'forward search'
  if (kind === CommandType.SearchBackward) return 'backward search'
  // should never happen
  else return 'search'
}

const view = ($: S) => h('div', {
  style: {
    display: 'flex',
    flex: 1,
  },
}, [

  ,h('div', {
    style: {
      ...paddingV(20),
      display: 'flex',
      alignItems: 'center',
      // TODO: figure out a good color from the colorscheme... StatusLine?
      background: rgba(217, 150, 255, 0.17),
    }
  }, [
    ,h('span', printCommandType($.kind))
  ])

  ,Input({
    small: true,
    focus: true,
    desc: 'search query',
    value: $.value,
    icon: Icon.Search,
    position: $.position,
  })

])

const containerEl = makel({
  position: 'absolute',
  width: '100%',
  display: 'flex',
  backdropFilter: 'blur(24px)',
  background: `rgba(var(--background-30-alpha), 0.6)`,
})

const ui = app<S, A>({ name: 'vim-search', state, actions, view, element: containerEl })

sub('search.hide', ui.hide)
sub('search.show', ui.show)
sub('search.update', ui.updateQuery)
