import { h } from './plugins'

type Props = {
  val: string,
  loading?: boolean,
  focus?: boolean,
  change?: (val: string) => void,
  select?: (val: string) => void,
  hide?: () => void,
  next?: () => void,
  prev?: () => void,
}

const nop = function () {}

export default ({ val, loading = false, focus: shouldFocus = false, change = nop, hide = nop, select = nop, next = nop, prev = nop }: Props) => h('.gui-input', [
  h('div', {
    style: {
      'pointer-events': 'none',
      display: 'flex',
      position: 'absolute',
    }
  }, [
    h('div', {
      style: {
        'pointer-events': 'none',
        color: 'transparent',
      }
    }, val.replace(/ /g, '@')),

    h('.gui-cursor', {
      style: {
        'pointer-events': 'none',
        color: 'transparent',
      }
    }, 'm'),
  ]),

  h('input', {
    value: val,
    onblur: () => hide(),
    onupdate: (e: HTMLInputElement) => e !== document.activeElement && shouldFocus && e.focus(),
    onkeydown: (e: KeyboardEvent) => {
      if (e.key === 'Escape') return hide()
      if (e.key === 'Enter') return select(val)
      if (e.key === 'Backspace') return change(val.slice(0, -1))
      if (e.metaKey && e.key === 'w') return change(val.split(' ').slice(0, -1).join(' '))
      if (e.metaKey && (e.key === 'j' || e.key === 'n')) return next()
      if (e.metaKey && (e.key === 'k' || e.key === 'p')) return prev()
      return change(val + (e.key.length > 1 ? '' : e.key))
    }
  }),

  h('div', { render: loading }, [
    h('.loader'),
  ]),
])
