import { h, app, style, Actions } from '../ui/uikit'
import { sub } from '../messaging/dispatch'
import { Plugin } from '../styles/common'
import Icon from '../components/icon'

enum NotifyKind {
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
  Success = 'success',
}

interface Notification {
  kind: NotifyKind,
  message: string,
}

interface State {
  notifications: Notification[],
}

const state: State = {
  notifications: [],
}

const notification = {
  display: 'flex',
  marginBottom: '6px',
  padding: '10px',
  background: 'rgb(20, 20, 20)',
}

const ErrorNotification = style('div')({
  ...notification,
  color: '#ef2f2f',
})

const InfoNotification = style('div')({
  ...notification,
  color: '#eee',
})

// TODO: dedup with other similar styles
const IconBox = style('div')({
  display: 'flex',
  paddingRight: '8px',
  alignItems: 'center',
})

const box = (StyleObject: Function, message: string, icon: string) => StyleObject({}, [
  ,IconBox({}, [ Icon(icon) ])
  ,h('span', message)
])

const view = ($: State) => Plugin.top('notifications', true, [

  ,h('div', $.notifications.map(({ kind, message }) => {

    if (kind === NotifyKind.Error) return box(ErrorNotification, message, 'error')
    if (kind === NotifyKind.Info) return box(InfoNotification, message, 'message-circle')

  }))

], {
  background: 'none',
  marginTop: '5px',
})

const a: Actions<State> = {}

a.notify = (s, _a, notification: Notification) => ({ notifications: [...s.notifications, notification] })

const ui = app({ state, view, actions: a }, false)

sub('notification:error', message => ui.notify({ message, kind: NotifyKind.Error } as Notification))
sub('notification:info', message => ui.notify({ message, kind: NotifyKind.Info } as Notification))
