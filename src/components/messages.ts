import { h, app, styled, vimBlur, vimFocus } from '../ui/uikit2'
import { NotifyKind, Notification } from '../ui/notifications'
import * as canvasContainer from '../core/canvas-container'
import { RowNormal } from '../components/row-container'
import Input from '../components/text-input'
import { colors } from '../styles/common'
import { filter } from 'fuzzaldrin-plus'
import { action } from '../core/neovim'
import Icon from '../components/icon'

const state = {
  query: '',
  messages: [] as Notification[],
  cache: [] as Notification[],
  vis: false,
  ix: 0,
}

type S = typeof state

let elref: HTMLElement
const SCROLL_AMOUNT = 0.4

const IconBox = styled.div`
  display: flex;
  align-items: center;
  padding-right: 10px;
`

// TODO: maybe this can be shared with notifications.ts component
const icons = new Map([
  ['error', { icon: 'xCircle', color: colors.error }],
  ['warning', { icon: 'alertTriangle', color: colors.warning }],
  ['success', { icon: 'CheckCircle', color: colors.success }],
  ['info', { icon: 'MessageCircle', color: '#eee' }],
  ['hidden', { icon: 'MessageCircle', color: '#eee' }],
  ['system', { icon: 'alertCircle', color: colors.system }],
])

const getIcon = (kind: NotifyKind) => {
  const { icon, color } = icons.get(kind) || icons.get('info')!
  return Icon(icon, { color, size: canvasContainer.font.size + 4 })
}

const actions =  {
  toggle: () => (s: S) => {
    const next = !s.vis
    next ? vimBlur() : vimFocus()
    return { vis: next }
  },

  hide: () => (vimFocus(), { vis: false }),

  addMessage: (message: Notification) => (s: S) => ({
    messages: [message, ...s.messages].slice(0, 500),
    cache: [message, ...s.messages].slice(0, 500),
  }),

  change: (query: string) => (s: S) => ({ query, messages: query
    ? filter(s.messages, query, { key: 'message' })
    : s.cache
  }),

  down: () => {
    const { height } = elref.getBoundingClientRect()
    elref.scrollTop += Math.floor(height * SCROLL_AMOUNT)
  },

  up: () => {
    const { height } = elref.getBoundingClientRect()
    elref.scrollTop -= Math.floor(height * SCROLL_AMOUNT)
  },
}

const view = ($: S, a: typeof actions) => h('div', {
  style: {
    background: 'var(--background-45)',
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
    up: a.up,
    hide: a.hide,
    down: a.down,
    change: a.change,
    value: $.query,
    focus: true,
    small: true,
    icon: 'filter',
    desc: 'filter messages',
  })

  ,h('div', {
    ref: (e: HTMLElement) => {
      if (e) elref = e
    },
    style: { overflowY: 'hidden' }
    // TODO: show timestamp and dedup. only dedup nearby?
  }, $.messages.map(({ id, kind, message }, pos) => h(RowNormal, {
    key: id,
    active: pos === $.ix
  }, [
    ,h(IconBox, [
      ,getIcon(kind)
    ])

    ,h('span', {
      style: {
        color: (icons.get(kind) || icons.get('info'))!.color
      }
    }, message)
  ])))

])

const ui = app({ name: 'messages', state, actions, view })

export const addMessage = (message: Notification) => ui.addMessage(message)

action('messages', () => ui.toggle())
