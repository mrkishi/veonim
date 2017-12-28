import * as canvasContainer from '../core/canvas-container'
import { xfrmUp } from '../core/input'
import { h, style } from '../ui/uikit'
import Icon from '../components/icon'

interface Props {
  val: string,
  icon: string,
  small?: boolean,
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
const nop = () => {}
const keToStr = (e: KeyboardEvent) => [
  e.key,
  <any>e.ctrlKey|0,
  <any>e.metaKey|0,
  <any>e.altKey|0,
  <any>e.shiftKey|0
].join('')

const Input = style('input')({
  '::placeholder': {
    color: 'rgba(255, 255, 255, 0.2)',
  },
  color: 'rgba(255, 255, 255, 0.9)',
  outline: 'none',
  border: 'none',
  fontFamily: 'var(--font)',
})

const IconBox = style('div')({
  display: 'flex',
  alignItems: 'center',
  paddingRight: '8px',
})

export default ({
  desc,
  icon,
  val = '',
  small = false,
  focus: shouldFocus = false,
  // TODO: what about a proxy here for noops?
  change = nop,
  hide = nop,
  select = nop,
  next = nop,
  prev = nop,
  nextGroup = nop,
  prevGroup = nop,
  down = nop,
  up = nop,
  top = nop,
  bottom = nop,
  jumpPrev = nop,
  jumpNext = nop,
  tab = nop,
  ctrlH = nop
}: Props) => h('div', {
  style: {
    paddingTop: `${small ? 5 : 10}px`,
    paddingBottom: `${small ? 5 : 10}px`,
    paddingLeft: '12px',
    paddingRight: '12px',
    display: 'flex',
    alignItems: 'center',
  }
}, [

  IconBox({}, [
    Icon(icon, {
      color: '#555',
      size: canvasContainer.font.size + (small ? 0 : 8),
      weight: 3,
    })
  ]),

  Input({
    style: {
      fontSize: `${canvasContainer.font.size + (small ? 0 : 4)}px`
    },
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
