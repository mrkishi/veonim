import * as canvasContainer from '../core/canvas-container'
import { hideCursor, showCursor } from '../core/cursor'
import { h, vimBlur, vimFocus } from '../ui/uikit'
import Loading from '../components/loading'
import { paddingVH, cvar } from '../ui/css'
import { xfrmUp } from '../core/input'
import Icon from '../components/icon'

interface Props {
  value: string,
  icon: string,
  background: string,
  color: string,
  small: boolean,
  desc: string,
  focus: boolean,
  position: number,
  useVimInput: boolean,
  change: (val: string) => void,
  select: (val: string) => void,
  hide: () => void,
  next: () => void,
  prev: () => void,
  nextGroup: () => void,
  prevGroup: () => void,
  down: () => void,
  up: () => void,
  top: () => void,
  bottom: () => void,
  jumpPrev: () => void,
  jumpNext: () => void,
  tab: () => void,
  ctrlH: () => void,
  ctrlG: () => void,
  ctrlL: () => void,
  ctrlC: () => void,
  yank: () => void,
  loading: boolean,
  loadingSize: number,
  loadingColor: string,
  pathMode: boolean,
  thisIsGarbage: (element: HTMLInputElement) => void,
}

export interface TextInputProps extends Partial<Props> {
  value: string,
  icon: string,
}

const setPosition = (e?: HTMLInputElement, position?: number) => {
  if (!e || !position) return
  position > -1 && e.setSelectionRange(position, position)
}

const setFocus = (e: HTMLInputElement, shouldFocus: boolean) => {
  if (e && e !== document.activeElement && shouldFocus) e.focus()
  if (!shouldFocus) e && e.blur()
}

const nopMaybe = (obj: object) => new Proxy(obj, {
  get: (_, key) => Reflect.get(obj, key) || (() => {})
}) as Props

const keToStr = (e: KeyboardEvent) => [
  e.key,
  <any>e.ctrlKey|0,
  <any>e.metaKey|0,
  <any>e.altKey|0,
  <any>e.shiftKey|0
].join('')

// TODO: could be better? it's global so will be shared between different
// inputs. however only one input will have focus at a time, so perhaps
// it's not a big deal
//
// the reason this has to live outside the function is because the view
// function will be triggered on re-render. pressing keys will potentially
// trigger re-renders, thus reseting the value of lastDown when inside
// the function.
let lastDown = ''

const view = ({
  desc,
  icon,
  color,
  background,
  loadingSize,
  loadingColor,
  value = '',
  position = -1,
  small = false,
  focus = false,
  loading = false,
  pathMode = false,
  useVimInput = false,
}: TextInputProps, $: Props) => h('div', {
  style: {
    background,
    ...paddingVH(12, small ? 5 : 10),
    display: 'flex',
    alignItems: 'center',
    minHeight: `${small ? 16 : 22}px`,
  }

}, [

  ,h('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      paddingRight: '8px',
    }
  }, [
    ,Icon(icon, {
      color: cvar('foreground-70'),
      size: canvasContainer.font.size + (small ? 0 : 8),
      weight: 2,
    })
  ])

  ,h('div', {
    style: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }
  }, [

    ,h('input', {
      value,
      style: {
        color,
        fontSize: small ? '1rem' : '1.286rem',
      },
      type: 'text',
      oncreate: (e: HTMLInputElement) => {
        setFocus(e, focus)
        setPosition(e, position)
      },
      onupdate: (e: HTMLInputElement) => {
        setFocus(e, focus)
        setPosition(e, position)
      },
      placeholder: desc,
      onfocus: () => useVimInput ? hideCursor() : vimBlur(),
      onblur: () => useVimInput ? showCursor() : vimFocus(),
      onKeyUp: (e: KeyboardEvent) => {
        const prevKeyAndThisOne = lastDown + keToStr(e)

        if (xfrmUp.has(prevKeyAndThisOne)) {
          const { key } = xfrmUp.get(prevKeyAndThisOne)!(e)
          if (key.toLowerCase() === '<esc>') {
            lastDown = ''
            const target = e.target as HTMLInputElement
            target.blur()
            return $.hide()
          }
        }
      },
      onKeyDown: (e: KeyboardEvent) => {
        const { ctrlKey: ctrl, metaKey: meta, key } = e
        const cm = ctrl || meta

        // TODO: needed?
        // e.preventDefault()
        lastDown = keToStr(e)

        if (key === 'Tab') return $.tab()
        if (key === 'Escape') return $.hide()
        if (key === 'Enter') return $.select(value)
        if (key === 'Backspace') return $.change(value.slice(0, -1))

        if (cm && key === 'w') return pathMode
          ? $.change(value.split('/').slice(0, -1).join('/'))
          : $.change(value.split(' ').slice(0, -1).join(' '))

        if (cm && key === 'g') return $.ctrlG()
        if (cm && key === 'h') return $.ctrlH()
        if (cm && key === 'l') return $.ctrlL()
        if (cm && key === 'c') return $.ctrlC()
        if (cm && key === 'j') return $.next()
        if (cm && key === 'k') return $.prev()
        if (cm && key === 'n') return $.nextGroup()
        if (cm && key === 'p') return $.prevGroup()
        if (cm && key === 'd') return $.down()
        if (cm && key === 'u') return $.up()
        if (cm && key === 'i') return $.jumpNext()
        if (cm && key === 'o') return $.jumpPrev()
        if (cm && key === 'y') return $.yank()
        if (cm && e.shiftKey && key === 'D') return $.bottom()
        if (cm && e.shiftKey && key === 'U') return $.top()

        $.change(value + (key.length > 1 ? '' : key))
      },
    })

    ,loading && Loading({ color: loadingColor, size: loadingSize })
  ])

])

export default (props: TextInputProps) => view(props, nopMaybe(props))
