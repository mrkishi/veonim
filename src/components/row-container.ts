import { cvar, paddingVH, paddingH } from '../ui/css'
import { colors } from '../styles/common'
import { h } from '../ui/uikit'

const row = {
  paddingTop: '4px',
  paddingBottom: '4px',
  paddingLeft: '12px',
  paddingRight: '12px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: 'flex',
  color: cvar('foreground-30'),
}

const activeRow = {
  ...row,
  fontWeight: 'bold',
  color: cvar('foreground-b20'),
  background: cvar('background-10'),
}

interface Options {
  key: any,
  active: boolean,
  [key: string]: any,
}

export const RowNormal = (o: Options, children = []) => h('div', {
  ...o,
  style: o.active ? activeRow : row,
}, children)

export const RowDesc = (o: Options, children = []) => h('div', {
  ...o,
  style: {
    ...(o.active ? activeRow : row),
    whiteSpace: 'normal',
    overflow: 'normal',
  },
}, children)

export const RowComplete = (o: Options, children = []) => h('div', {
  ...o,
  style: {
    ...(o.active ? activeRow : row),
    ...paddingVH(0, 0),
    paddingRight: '8px',
    lineHeight: cvar('line-height'),
  }
}, children)

export const RowHeader = (o: Options, children = []) => h('div', {
  ...o,
  style: {
    ...(o.active ? activeRow : row),
    ...paddingH(6),
    alignItems: 'center',
    color: colors.hint,
    background: cvar('background-20'),
    ...(o.active ? {
      color: '#fff',
      fontWeight: 'normal',
      background: cvar('background-b10'),
    }: 0)
  }
}, children)

export const RowImportant = (opts = {} as any, children = []) => h('div', {
  ...opts,
  style: {
    ...opts.style,
    ...row,
    ...paddingH(8),
    color: cvar('important'),
    background: cvar('background-50'),
  }
}, children)

export const RowGroup = (opts = {} as any, children: any[]) => h('div', {
  ...opts,
  style: {
    ...opts.style,
    ...paddingH(4),
  }
}, children)
