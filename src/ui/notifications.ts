import { h, app, Actions } from './uikit'
import { sub } from '../dispatch'
import { is } from '../utils'

enum NotifyKind { error = 'error', warning = 'warning', info = 'info', success = 'success' }
interface Notification { type: NotifyKind, title: string, message: string | string[] }
interface State { notifications: Notification[] }

const state: State = { notifications: [] }

const view = ({ notifications }: State, { dismiss }: any) =>
h('#notifications', notifications.map(({ type, title, message }, ix) => h(`.notification.${type}`, [
  h('.header', [
    h('.title', title),
    h('button.close', { onclick: () => dismiss(ix) }, `×`),
  ]),
  h('.message', is.array(message)
    ? (message as string[]).map(m => h('.line', m))
    : message
  ),
])))
  
const a: Actions<State> = {}

a.dismiss = (s, _a, ix: number) => ({ notifications: s.notifications.filter((_, index) => index !== ix) })
a.notify = (s, _a, notification: Notification) => ({ notifications: [...s.notifications, notification] })

const ui = app({ state, view, actions: a }, false)

sub('notification:error', ({ title, message }) => ui.notify({ title, message, type: NotifyKind.error }))
sub('notification:warning', ({ title, message }) => ui.notify({ title, message, type: NotifyKind.warning }))
sub('notification:info', ({ title, message }) => ui.notify({ title, message, type: NotifyKind.info }))
sub('notification:success', ({ title, message }) => ui.notify({ title, message, type: NotifyKind.success }))
// TODO: add styles for warning, info, success
