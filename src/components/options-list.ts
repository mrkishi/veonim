import { merge } from '../support/utils'
import { h } from '../ui/uikit2'

const activeStyle = 'determine what the active style should be?'

// TODO: accept a list of components
export default (components: any[], activeIndex = 0, scrollPosition = 0) => {
  const items = components.map((m, ix) => ix !== activeIndex
    ? m
    : merge(m, { style: activeStyle }))

  return h('div', {
    ref: (e: HTMLElement) => {
      e.scrollTop = scrollPosition
    },
    style: {
      maxHeight: '50vh',
      overflowY: 'hidden',
    }
  }, items)
}
