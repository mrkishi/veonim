import { paddingVH, paddingH } from '../ui/css'
import { style } from '../ui/uikit'

type WhateverObject = { [index: string]: any }
type StyleParams = WhateverObject & { activeWhen?: boolean } | undefined
type Content = any[] | string | number

export const modstyl = (states: object) => (params: StyleParams, content: Content) => {
  if (params && params.activeWhen) {
    const styl = Reflect.get(states, 'active')
    if (typeof styl === 'function') return styl(params, content)
    else throw new Error(`styled component defined 'activeWhen' property, however no 'active' state object was found`)
  }

  const styl = Reflect.get(states, 'normal')
  if (typeof styl === 'function') return styl(params || {}, content)
  else throw new Error(`styled component has no default 'active' state object`)
}

const plugin = {
  display: 'flex',
  width: '100%',
  justifyContent: 'center',
}

export const Plugin = {
  top: style('div')({ ...plugin, alignItems: 'flex-start' }),
  bottom: style('div')({ ...plugin, alignItems: 'flex-end' }),
  right: style('div')({ ...plugin, justifyContent: 'flex-end', alignItems: 'stretch' }),
}

export const panelColors = {
  bg: '#222',
}

const rowLastPad = {
  ':last-child': {
    paddingBottom: '9px',
  },
}

const row = {
  ...paddingVH(12, 4),
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: 'flex',
}

export const Row = {
  default: modstyl({
    normal: style('div')(row),
    active: style('div')({
      ...row,
      background: 'rgba(255, 255, 255, 0.08)',
    })
  }),

  plain: modstyl({
    normal: style('div')({ ...row, ...rowLastPad }),
    active: style('div')({
      ...row,
      ...rowLastPad,
      background: 'rgba(255, 255, 255, 0.08)',
      color: '#eee',
      fontWeight: 'bold',
    })
  }),

  complete: modstyl({
    normal: style('div')({
      ...row,
      ...paddingVH(8, 0),
      lineHeight: `var(--line-height)`,
    }),
    active: style('div')({
      ...row,
      ...paddingVH(8, 0),
      lineHeight: `var(--line-height)`,
      background: 'rgba(255, 255, 255, 0.08)',
      color: '#eee',
      fontWeight: 'bold',
    })
  }),

  header: modstyl({
    normal: style('div')({
      ...row,
      ...paddingH(6),
      display: 'flex',
      alignItems: 'center',
      color: '#c7c7c7',
      background: '#2b2b2b',
    }),
    active: style('div')({
      ...row,
      ...paddingH(6),
      color: '#fff',
      background: '#5a5a5a',
      fontWeight: 'normal',
    })
  }),

  group: style('div')(paddingH(4)),
}
