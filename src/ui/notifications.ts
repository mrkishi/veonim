import { PluginTop } from '../components/plugin-container'
import { merge, uuid, debounce } from '../support/utils'
import { colors, badgeStyle } from '../styles/common'
import { addMessage } from '../components/messages'
import Icon from '../components/icon'
import { h, app } from '../ui/uikit'
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

export interface Notification {
  id: string,
  kind: NotifyKind,
  message: string,
  count: number,
  expire?: FlexibleExpire,
  time: number,
}

const state = {
  notifications: [] as Notification[],
}

type S = typeof state

const expire = (time: number, cb: Function): FlexibleExpire => {
  const refresh = debounce(cb, time)
  return (refresh(), { refresh })
}

const container = document.getElementById('notifications') as HTMLElement
merge(container.style, { zIndex: 80 })

const renderIcons = new Map([
  [ NotifyKind.Error, 'xCircle' ],
  [ NotifyKind.Warning, 'alertTriangle' ],
  [ NotifyKind.Success, 'checkCircle' ],
  [ NotifyKind.Info, 'messageCircle' ],
  [ NotifyKind.System, 'alertCircle' ],
])

const getIcon = (kind: NotifyKind) => renderIcons.get(kind)!

const actions = {
  notify: (notification: Notification) => (s: S) => {
    if (notification.kind === NotifyKind.Hidden) return

    const existingIndex = s.notifications.findIndex(n => n.message === notification.message)

    if (existingIndex > -1) {
      const ns = s.notifications.slice()
      ns[existingIndex].count += 1
      ns[existingIndex].expire!.refresh()
      return { notifications: ns }
    }

    const time = notification.kind === NotifyKind.Info ? 1200 : 3e3
    notification.expire = expire(time, () => ui.expire(notification.id))
    return { notifications: [...s.notifications, notification] }
  },

  expire: (id: string) => (s: S) => ({ notifications: s.notifications.filter(m => m.id !== id) }),
}

const view = ($: S) => PluginTop(true, [

  ,h('div', {
    style: {
      position: 'absolute',
      background: 'none',
      marginTop: '5px',
    }
  }, $.notifications.map(({ id, kind, message, count }) => h('div', {
      key: id,
      style: {
        display: 'flex',
        padding: '10px',
        marginBottom: '6px',
        justifyContent: 'space-between',
        background: 'var(--background-50)',
        color: Reflect.get(colors, kind),
      },
      onCreate: (e: HTMLElement) => animate(e, [
        { opacity: 0, transform: 'translateY(-100%) '},
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 150 }),
      onRemove: async (e: HTMLElement) => {
        await animate(e, [
          { opacity: 1 },
          { opacity: 0 },
        ], { duration: 2e3 })

        e.remove()
      },
    }, [

      ,h('div', {
        style: {
          display: 'flex',
          wordBreak: 'break-all',
        }
      }, [
        ,h('div', {
          style: {
            display: 'flex',
            paddingRight: '8px',
            alignItems: 'center',
          }
        }, [
          ,Icon(getIcon(kind))
        ])

        ,h('span', message)
      ])

      ,count > 1 && h('div', {
        style: {
          ...badgeStyle,
          alignSelf: 'flex-end',
        },
      }, [
        ,h('span', count)
      ])

    ]))

  )

])

const ui = app<S, typeof actions>({ name: 'notifications', element: container, state, actions, view })

export const notify = (message: string, kind = NotifyKind.Info) => {
  const msg = {
    kind,
    message,
    time: Date.now(),
    id: uuid(),
    count: 1,
  }

  ui.notify(msg)
  addMessage(msg)
}
