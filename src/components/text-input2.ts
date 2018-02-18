import { blur as vimBlur, focus as vimFocus } from '../core/input'
// import { xfrmUp } from '../core/input'
import { paddingVH } from '../ui/css'
import { h } from '../ui/coffee'

interface Props {
  value: string,
  icon: string,
  background: string,
  color: string,
  small: boolean,
  desc: string,
  focus: boolean,
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

const nopMaybe = (obj: object) => new Proxy(obj, {
  get: (_, key) => Reflect.get(obj, key) || (() => {})
}) as Props

const view = ({
  desc,
  // icon,
  color,
  background,
  // loadingSize,
  // loadingColor,
  value = '',
  small = false,
  focus = false,
  // pathMode = false,
  // loading = false,
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
      color,
    },
    type: 'text',
    value,
    autoFocus: focus,
    placeholder: desc,
    onFocus: () => vimBlur(),
    onBlur: () => vimFocus(),
    onChange: (e: any) => $.change(e.target.value)
  })
])

export default (props: TextInputProps) => view(nopMaybe(props))
