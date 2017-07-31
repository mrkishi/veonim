import { h } from './plugins'

interface Key {
  val: string,
  alt: boolean,
  ctrl: boolean,
  meta: boolean,
  shift: boolean,
}

interface Props {
  val: string,
  desc?: string,
  focus?: boolean,
  change?: (val: string) => void,
  select?: (val: string) => void,
  hide?: () => void,
  next?: () => void,
  prev?: () => void,
  onkey?: (event: Key) => void,
  down?: () => void,
  up?: () => void,
}

const nop = function () {}

export default ({ val = '', desc, focus: shouldFocus = false, onkey = nop, change = nop, hide = nop, select = nop, next = nop, prev = nop, down = nop, up = nop }: Props) => h('.gui-input', [
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
    placeholder: desc,
    onblur: () => hide(),
    onupdate: (e: HTMLInputElement) => e !== document.activeElement && shouldFocus && e.focus(),
    onkeydown: (e: KeyboardEvent) => {
      if (e.key === 'Escape') return hide()
      if (e.key === 'Enter') return select(val)
      if (e.key === 'Backspace') return change(val.slice(0, -1))
      // TODO: handle ctrl on win/linux?
      if (e.metaKey && e.key === 'w') return change(val.split(' ').slice(0, -1).join(' '))
      if (e.metaKey && (e.key === 'j' || e.key === 'n')) return next()
      if (e.metaKey && (e.key === 'k' || e.key === 'p')) return prev()
      if (e.metaKey && e.key === 'd') return down()
      if (e.metaKey && e.key === 'u') return up()

      onkey({ val: e.key, ctrl: e.ctrlKey, alt: e.altKey, meta: e.metaKey, shift: e.shiftKey })
      change(val + (e.key.length > 1 ? '' : e.key))
    }
  }),
])
