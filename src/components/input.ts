import { xfrmUp } from '../core/input'
import { h } from '../ui/uikit'

interface Props {
  val: string,
  desc?: string,
  focus?: boolean,
  change?: (val: string) => void,
  select?: (val: string) => void,
  hide?: () => void,
  next?: () => void,
  prev?: () => void,
  nextGroup?: () => void,
  prevGroup?: () => void,
  down?: () => void,
  up?: () => void,
  top?: () => void,
  bottom?: () => void,
  jumpPrev?: () => void,
  jumpNext?: () => void,
  tab?: () => void,
  ctrlH?: () => void,
}

let lastDown = ''
const keToStr = (e: KeyboardEvent) => [e.key, <any>e.ctrlKey|0, <any>e.metaKey|0, <any>e.altKey|0, <any>e.shiftKey|0].join('')
const nop = () => {}

export default ({ val = '', desc, focus: shouldFocus = false, change = nop, hide = nop, select = nop, next = nop, prev = nop, nextGroup = nop, prevGroup = nop, down = nop, up = nop, top = nop, bottom = nop, jumpPrev = nop, jumpNext = nop, tab = nop, ctrlH = nop }: Props) => h('.gui-input', [
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
      const prevKeyAndThisOne = lastDown + keToStr(e)

      if (xfrmUp.has(prevKeyAndThisOne)) {
        const { key } = xfrmUp.get(prevKeyAndThisOne)!(e)
        if (key.toLowerCase() === '<esc>') {
          lastDown = ''
          return hide()
        }
      }
    },
    onkeydown: (e: KeyboardEvent) => {
      const { ctrlKey: ctrl, metaKey: meta, key } = e
      e.preventDefault()
      lastDown = keToStr(e)

      if (key === 'Tab') return tab()
      if (key === 'Escape') return hide()
      if (key === 'Enter') return select(val)
      if (key === 'Backspace') return change(val.slice(0, -1))

      const cm = ctrl || meta
      if (cm && key === 'w') return change(val.split(' ').slice(0, -1).join(' '))
      if (cm && key === 'h') return ctrlH()
      if (cm && key === 'j') return next()
      if (cm && key === 'k') return prev()
      if (cm && key === 'n') return nextGroup()
      if (cm && key === 'p') return prevGroup()
      if (cm && key === 'd') return down()
      if (cm && key === 'u') return up()
      if (cm && key === 'i') return jumpNext()
      if (cm && key === 'o') return jumpPrev()
      if (cm && e.shiftKey && key === 'D') return bottom()
      if (cm && e.shiftKey && key === 'U') return top()

      change(val + (key.length > 1 ? '' : key))
    }
  }),
])
