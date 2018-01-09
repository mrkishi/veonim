import { Badge, Plugin, colors } from '../styles/common'
import { merge, uuid, debounce } from '../support/utils'
import { h, app, style, Actions } from '../ui/uikit'
import Icon from '../components/icon'
import { animate } from '../ui/css'

export enum NotifyKind {
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
  Success = 'success',
  System = 'system',
  Hidden = 'hidden',
}

interface FlexibleExpire {
  refresh(): void
}

interface Notification {
  id: string,
  kind: NotifyKind,
  message: string,
  count: number,
  expire?: FlexibleExpire,
}

interface State {
  notifications: Notification[],
}

const state: State = {
  notifications: [],
}

const expire = (time: number, cb: Function): FlexibleExpire => {
  const refresh = debounce(cb, time)
  return (refresh(), { refresh })
}

const container = document.getElementById('notifications') as HTMLElement
merge(container.style, { zIndex: 80 })

const notification = {
  display: 'flex',
  marginBottom: '6px',
  padding: '10px',
  background: colors.overlay.background,
}

const Notification = style('div')({
  ...notification,
  color: '#eee',
})

const Err = style('div')({
  ...notification,
  color: colors.error,
})

const Success = style('div')({
  ...notification,
  color: colors.success,
})

const Warn = style('div')({
  ...notification,
  color: colors.warning,
})

// TODO: dedup with other similar styles
const IconBox = style('div')({
  display: 'flex',
  paddingRight: '8px',
  alignItems: 'center',
})

const box = (StyleObject: Function, message: string, count: number, icon: string) => StyleObject({
  style: { justifyContent: 'space-between' },

  oncreate: (e: HTMLElement) => animate(e, [
    { opacity: 0, transform: 'translateY(-100%) '},
    { opacity: 1, transform: 'translateY(0)' },
  ], { duration: 150 }),

  onremove: async (e: HTMLElement) => {
    await animate(e, [
      { opacity: 1 },
      { opacity: 0 },
    ], { duration: 250 })

    // TODO: does not always remove...
    e.remove()
  }
}, [
  ,h('div', { style: { display: 'flex' } }, [
    ,IconBox({}, [ Icon(icon) ])
    ,h('span', message)
  ])

  ,count > 1 && Badge(count, { alignSelf: 'flex-end' })
])

const view = ($: State) => Plugin.top('notifications', true, [

  ,h('div', $.notifications.map(({ kind, message, count }) => {

    if (kind === NotifyKind.Error) return box(Err, message, count, 'error')
    if (kind === NotifyKind.Warning) return box(Warn, message, count, 'warning')
    if (kind === NotifyKind.Success) return box(Success, message, count, 'check-circle')
    if (kind === NotifyKind.Info) return box(Notification, message, count, 'message-circle')
    if (kind === NotifyKind.System) return box(Notification, message, count, 'info')

  }))

], {
  position: 'absolute',
  background: 'none',
  marginTop: '5px',
})

const a: Actions<State> = {}

a.notify = (s, a, notification: Notification) => {
  const existingIndex = s.notifications.findIndex(n => n.message === notification.message)

  if (existingIndex > -1) {
    const ns = s.notifications.slice()
    ns[existingIndex].count += 1
    ns[existingIndex].expire!.refresh()
    return { notifications: ns }
  }

  const time = notification.kind === NotifyKind.Info ? 1200 : 3e3
  notification.expire = expire(time, () => a.expire(notification.id))
  return { notifications: [...s.notifications, notification] }
}

a.expire = (s, _a, id: string) =>
  ({ notifications: s.notifications.filter(m => m.id !== id) })

const ui = app({ state, view, actions: a }, false, container)

export const notify = (message: string, kind = NotifyKind.Info) => ui.notify({
  kind,
  message,
  id: uuid(),
  count: 1,
})
