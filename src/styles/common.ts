import { style } from '../ui/uikit'

export const Row = style('div')({
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
})
