import { hideCursor, showCursor, disableCursor, enableCursor, cursor } from '../core/cursor'
import { currentWindowElement, getWindow } from '../core/windows'
import { CommandType, CommandUpdate } from '../core/render'
import { CanvasWindow } from '../core/canvas-window'
import Input from '../components/text-input'
import { sub } from '../messaging/dispatch'
import { rgba, paddingV } from '../ui/css'
import * as Icon from 'hyperapp-feather'
import { is } from '../support/utils'
import { makel } from '../ui/vanilla'
import { app, h } from '../ui/uikit'

const state = {
  visible: false,
  value: '',
  position: 0,
  kind: CommandType.Ex,
}

type S = typeof state

let targetCanvasWin: CanvasWindow

const actions = {
  hide: () => {
    enableCursor()
    showCursor()
    currentWindowElement.remove(containerEl)
    if (targetCanvasWin) targetCanvasWin.setOverflowScrollState(true)
    return { value: '', visible: false }
  },
  updateQuery: ({ cmd, kind, position }: CommandUpdate) => (s: S) => {
    const cmdKind = kind || s.kind
    hideCursor()
    disableCursor()

    !s.visible && setImmediate(() => {
      currentWindowElement.add(containerEl)
      const w = getWindow(cursor.row, cursor.col, { getStuff: true })
      if (!w) return console.warn('current window not found when trying to render vim-search. this means that canvas window overflow scrolling was not disabled. vim-search can be scrolled outta bounds!')
      targetCanvasWin = w.canvas
      w.canvas.setOverflowScrollState(false)
    })

    return {
      position,
      kind: cmdKind,
      visible: true,
      value: is.string(cmd) && s.value !== cmd
        ? cmd
        : s.value
    }
  },
}

type A = typeof actions

const printCommandType = (kind: CommandType) => {
  if (kind === CommandType.SearchForward) return 'forward search'
  if (kind === CommandType.SearchBackward) return 'backward search'
  // should never happen
  else return 'search'
}

const view = ($: S, a: A) => h('div', {
  style: {
    display: $.visible ? 'flex' : 'none',
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
    focus: $.visible,
    useVimInput: true,
    desc: 'search query',
    value: $.value,
    icon: Icon.Search,
    position: $.position,
    hide: a.hide,
    select: a.hide,
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
sub('search.update', ui.updateQuery)
