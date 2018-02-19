import { blur as vimBlur, focus as vimFocus } from '../core/input'
import * as canvasContainer from '../core/canvas-container'
import Loading from '../components/loading2'
import { paddingVH, cvar } from '../ui/css'
import { h, styled } from '../ui/coffee'
import { xfrmUp } from '../core/input'
import Icon from '../components/icon2'

interface Props {
  value: string,
  icon: string,
  background: string,
  color: string,
  small: boolean,
  desc: string,
  focus: boolean,
  position: number,
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

let lastDown = ''

const setPosition = (e?: HTMLInputElement, position?: number) => {
  if (!e || !position) return
  position > -1 && e.setSelectionRange(position, position)
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

const IconBox = styled.div`
  display: flex;
  align-items: center;
  padding-right: 8px;
`

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
}: TextInputProps, $: Props) => h('div', {
  style: {
    background,
    ...paddingVH(12, small ? 5 : 10),
    display: 'flex',
    alignItems: 'center',
    minHeight: `${small ? 16 : 22}px`,
  }

}, [

  ,h(IconBox, [
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
      style: {
        color,
        fontSize: small ? '1rem' : '1.286rem',
      },
      type: 'text',
      value,
      ref: (e: HTMLInputElement) => setPosition(e, position),
      autoFocus: focus,
      placeholder: desc,
      onFocus: () => vimBlur(),
      onBlur: () => vimFocus(),
      onChange: (e: any) => $.change(e.target.value),
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

        e.preventDefault()
        lastDown = keToStr(e)

        if (key === 'Tab') return $.tab()
        if (key === 'Escape') return $.hide()
        if (key === 'Enter') return $.select(value)
        if (key === 'Backspace') return $.change(value.slice(0, -1))

        if (cm && key === 'w') return pathMode
          ? $.change(value.split('/').slice(0, -1).join('/'))
          : $.change(value.split(' ').slice(0, -1).join(' '))

        if (cm && key === 'h') return $.ctrlH()
        if (cm && key === 'g') return $.ctrlG()
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
