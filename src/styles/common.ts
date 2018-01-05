import { style } from '../ui/uikit'

const row = {
  ':last-child': {
    paddingBottom: '9px',
  },
  paddingLeft: '12px',
  paddingRight: '12px',
  paddingTop: '4px',
  paddingBottom: '4px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: 'flex',
}

export const Row = style('div')(row)

export const RowHeader = style('div')({
  ...row,
  display: 'flex',
  alignItems: 'center',
  paddingTop: '6px',
  paddingBottom: '6px',
  color: '#c7c7c7',
  background: '#2b2b2b',
})

export const RowGroup = style('div')({
  paddingTop: '4px',
  paddingBottom: '4px',
})
