import { paddingVH, paddingH } from '../ui/css'
import { is } from '../support/utils'
import { style } from '../ui/uikit'

type WhateverObject = { [index: string]: any }
type StyleParams = WhateverObject & { activeWhen?: boolean }
type Content = any[] | string | number
type SC1 = (content: Content) => any
type SC2 = (params: StyleParams, content: Content) => any
type StyledComponent = SC1 & SC2

const isContent = (thing: any) => is.array(thing) || is.string(thing) || is.number(thing)

export const modstyl = (states: object): StyledComponent => (...args: any[]) => {
  const params: StyleParams = args.find(a => is.object(a)) || {}
  const content: Content = args.find(isContent)

  if (params.activeWhen) {
    const styl = Reflect.get(states, 'active')
    if (is.function(style)) return styl(params, content)
    else throw new Error(`styled component defined 'activeWhen' property, however no 'active' state object was found`)
  }

  const styl = Reflect.get(states, 'normal')
  if (is.function(style)) return styl(params, content)
  else throw new Error(`styled component has no default 'active' state object`)
}

const pluginBase = {
  display: 'flex',
  width: '100%',
  justifyContent: 'center',
}

const plugin = {
  default: style('div')({ ...pluginBase, alignItems: 'flex-start' }),
  normal: style('div')({
    ...pluginBase,
    alignItems: 'flex-start',
    background: 'rbg(20, 20, 20)',
    marginTop: '15%',
    width: '600px',
  }),
  bottom: style('div')({ ...pluginBase, alignItems: 'flex-end' }),
  right: style('div')({
    ...pluginBase,
    justifyContent: 'flex-end',
    alignItems: 'stretch'
  }),
}

const Dialog = style('div')({
  background: 'rgb(20, 20, 20)',
  marginTop: '15%',
})

const dialogCreator = (size: number, content: Content) => Dialog({ style: { width: `${size}px` } }, content)

const pluginCreator = (id: string, visible: boolean, content: Content, type: string) =>
  Reflect.get(plugin, type)({ id, style: { display: visible ? 'flex' : 'none' }}, content)

export const Plugin = {
  default: (name: string, visible: boolean, content: Content) =>
    pluginCreator(name, visible, dialogCreator(600, content), 'default'),
  bottom: (name: string, visible: boolean, content: Content) =>
    pluginCreator(name, visible, content, 'bottom'),
  right: (name: string, visible: boolean, content: Content) =>
    pluginCreator(name, visible, Dialog({ style: {
      height: '100%',
      width: '500px',
      flexFlow: 'column',
      marginTop: '0px',
    }}, content), 'right'),
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
  color: '#aaa',
}

const activeRow = {
  ...row,
  color: '#fff',
  fontWeight: 'bold',
  background: 'rgba(255, 255, 255, 0.08)',
}

export const Row = {
  normal: modstyl({
    normal: style('div')(row),
    active: style('div')(activeRow)
  }),

  files: modstyl({
    normal: style('div')({ ...row, ...rowLastPad }),
    active: style('div')({ ...activeRow, ...rowLastPad }),
  }),

  complete: modstyl({
    normal: style('div')({
      ...row,
      ...paddingVH(8, 0),
      lineHeight: `var(--line-height)`,
    }),
    active: style('div')({
      ...activeRow,
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

  important: modstyl({
    normal: style('div')({
      ...row,
      ...paddingH(8),
      color: '#ffd800',
      background: 'rgb(10, 10, 10)',
    })
  }),

  group: style('div')(paddingH(4)),
}
