import { connect, go } from '../state/trade-federation'
import { Hover } from '../state/hover'
import { h } from '../ui/coffee'
import { blur, focus } from '../core/input'
import { xfrmUp } from '../core/input'
import { paddingVH } from '../ui/css'

export interface Props {
  value: string,
  icon: string,
  background?: string,
  color?: string,
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
  ctrlG?: () => void,
  yank?: () => void,
  loading?: boolean,
  loadingSize?: number,
  loadingColor?: string,
  pathMode?: boolean,
  thisIsGarbage?: (element: HTMLInputElement) => void,
}

const nopMaybe = <T>(obj: T) => new Proxy(obj, {
  get: (_, key) => Reflect.get(obj, key) || () => {}
})


const view = ({
  desc,
  icon,
  color,
  background,
  loadingSize,
  loadingColor,
  value = '',
  small = false,
  focus = false,
  pathMode = false,
  loading = false,
  ...$,
}: Props) => h('div', {
  style: {
    background,
    ...paddingVH(12, small ? 5 : 10),
    display: 'flex',
    alignItems: 'center',
    minHeight: `${small ? 16 : 22}px`,
  }

}, [
  ,h('div', 'do awesome shit here')

  ,h('input', {
    style: {
      color: 'red',
      background: 'yellow',
    },
    type: 'text',
    autoFocus: $.focus,
    value: $.value,
    onFocus: () => blur(),
    onBlur: () => focus(),
    onChange: (e: any) => {
      go.updateHover(e.target.value)
    },
  })
])

export default (props: Props) => view(nopMaybe(props))
