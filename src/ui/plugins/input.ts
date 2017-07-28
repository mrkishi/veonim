const { h: hyperscript } = require('hyperapp')
import huu from 'huu'
const h = huu(hyperscript)

type Props = {
  val: string,
  focus?: boolean,
  onchange?: (val: string) => void,
  onselect?: (val: string) => void,
  oncancel?: () => void,
}

const nop = function () {}

export default ({ val, focus: shouldFocus = false, onchange = nop, oncancel = nop, onselect = nop }: Props) => h('.gui-input', [
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
    onblur: () => oncancel(),
    onupdate: (e: HTMLInputElement) => e !== document.activeElement && shouldFocus && e.focus(),
    onkeydown: (e: KeyboardEvent) => {
      if (e.key === 'Escape') return oncancel()
      if (e.key === 'Enter') return onselect(val)
      if (e.key === 'Backspace') return onchange(val.slice(0, -1))
      if (e.metaKey && e.key === 'w') return onchange(val.split(' ').slice(0, -1).join(' '))
      return onchange(val + (e.key.length > 1 ? '' : e.key))
    }
  }),
])
