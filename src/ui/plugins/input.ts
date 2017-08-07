import { h } from './plugins'

interface Props {
  val: string,
  desc?: string,
  focus?: boolean,
  change?: (val: string) => void,
  select?: (val: string) => void,
  hide?: () => void,
  next?: () => void,
  prev?: () => void,
  down?: () => void,
  up?: () => void,
  top?: () => void,
  bottom?: () => void,
  jumpPrev?: () => void,
  jumpNext?: () => void,
  tab?: () => void,
}

let lastDown = ''
const keToStr = (e: KeyboardEvent) => [e.key, <any>e.ctrlKey|0, <any>e.metaKey|0, <any>e.altKey|0, <any>e.shiftKey|0].join('')
const nop = () => {}

export default ({ val = '', desc, focus: shouldFocus = false, change = nop, hide = nop, select = nop, next = nop, prev = nop, down = nop, up = nop, top = nop, bottom = nop, jumpPrev = nop, jumpNext = nop, tab = nop }: Props) => h('.gui-input', [
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
    onkeyup: (e: KeyboardEvent) => {
      // TODO: make it better. support ctrl?
      if (lastDown === 'Meta0100' && keToStr(e) === 'Meta0000') {
        lastDown = ''
        return hide()
      }
    },
    onkeydown: (e: KeyboardEvent) => {
      e.preventDefault()
      lastDown = keToStr(e)

      if (e.key === 'Tab') return tab()
      if (e.key === 'Escape') return hide()
      if (e.key === 'Enter') return select(val)
      if (e.key === 'Backspace') return change(val.slice(0, -1))

      const cm = e.ctrlKey || e.metaKey
      if (cm && e.key === 'w') return change(val.split(' ').slice(0, -1).join(' '))
      if (cm && (e.key === 'j' || e.key === 'n')) return next()
      if (cm && (e.key === 'k' || e.key === 'p')) return prev()
      if (cm && e.key === 'd') return down()
      if (cm && e.key === 'u') return up()
      if (cm && e.shiftKey && e.key === 'D') return bottom()
      if (cm && e.shiftKey && e.key === 'U') return top()
      if (cm && e.shiftKey && e.key === 'U') return top()
      if (cm && e.key === 'i') return jumpNext()
      if (cm && e.key === 'o') return jumpPrev()

      change(val + (e.key.length > 1 ? '' : e.key))
    }
  }),
])
