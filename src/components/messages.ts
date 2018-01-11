import { h, app, style, Actions, ActionCaller, vimBlur, vimFocus } from '../ui/uikit'
import { NotifyKind, Notification } from '../ui/notifications'
import * as canvasContainer from '../core/canvas-container'
import { Row, colors } from '../styles/common'
import Input from '../components/text-input'
import { filter } from 'fuzzaldrin-plus'
import { action } from '../core/neovim'
import Icon from '../components/icon'

interface State {
  query: string,
  messages: Notification[],
  cache: Notification[],
  vis: boolean,
  ix: number,
}

let elref: HTMLElement
const SCROLL_AMOUNT = 0.4

const state: State = {
  query: '',
  messages: [],
  cache: [],
  vis: false,
  ix: 0,
}

const IconBox = style('div')({
  display: 'flex',
  alignItems: 'center',
  paddingRight: '10px',
})

// TODO: maybe this can be shared with notifications.ts component
const icons = new Map([
  ['error', { icon: 'error', color: colors.error }],
  ['warning', { icon: 'warning', color: colors.warning }],
  ['success', { icon: 'check-circle', color: colors.success }],
  ['info', { icon: 'message-circle', color: '#eee' }],
  ['hidden', { icon: 'message-circle', color: '#eee' }],
  ['system', { icon: 'info', color: colors.system }],
])

const getIcon = (kind: NotifyKind) => {
  const { icon, color } = icons.get(kind) || icons.get('info')!
  return Icon(icon, { color, size: canvasContainer.font.size + 4 })
}

const view = ($: State, actions: ActionCaller) => h('#messages', {
  style: {
    // TODO: vim colors
    background: 'rgb(20, 20, 20)',
    color: '#eee',
    display: $.vis ? 'flex' : 'none',
    flexFlow: 'column',
    position: 'absolute',
    alignSelf: 'flex-end',
    maxHeight: '70vh',
    width: '100%',
  }
}, [

  ,Input({
    ...actions,
    val: $.query,
    focus: true,
    small: true,
    icon: 'filter',
    desc: 'filter messages',
  })

  ,h('div', {
    onupdate: (e: HTMLElement) => elref = e,
    style: { overflowY: 'hidden' }
  // TODO: show timestamp and dedup. only dedup nearby?
  }, $.messages.map(({ id, kind, message }, pos) => Row.normal({
    key: id,
    activeWhen: pos === $.ix
  }, [
    ,IconBox({}, getIcon(kind))

    ,h('span', {
      style: {
        color: (icons.get(kind) || icons.get('info'))!.color
      }
    }, message)
  ])))

])

const a: Actions<State> = {}

a.toggle = s => {
  const next = !s.vis
  next ? vimBlur() : vimFocus()
  return { vis: next }
}

a.hide = () => (vimFocus(), { vis: false })

a.addMessage = (s, _a, message) => ({
  messages: [message, ...s.messages].slice(0, 500),
  cache: [message, ...s.messages].slice(0, 500),
})

a.change = (s, _a, query: string) => ({ query, messages: query
  ? filter(s.messages, query, { key: 'message' })
  : s.cache
})

a.down = () => {
  const { height } = elref.getBoundingClientRect()
  elref.scrollTop += Math.floor(height * SCROLL_AMOUNT)
}

a.up = () => {
  const { height } = elref.getBoundingClientRect()
  elref.scrollTop -= Math.floor(height * SCROLL_AMOUNT)
}

const ui = app({ state, view, actions: a }, false)

export const addMessage = (message: Notification) => ui.addMessage(message)

action('messages', () => ui.toggle())
