import { s, styled } from '../ui/coffee'

interface Props {
  active: boolean
}

const row = `
  padding-top: 4px;
  padding-bottom: 4px;
  padding-left: 12px;
  padding-right: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  color: var(--foreground-30);
`

const activeRow = `
  ${row}
  font-weight: bold;
  color: var(--foreground-b20);
  background: var(--background-10);
`

export const RowNormal = s<Props>(styled.div)`
  ${p => p.active ? activeRow : row}
`

export const RowDesc = s<Props>(styled.div)`
  ${p => p.active ? activeRow : row}
  white-space: normal;
  overflow: normal;
`

export const RowFiles = s<Props>(styled.div)`
  ${p => p.active ? activeRow : row}
  &:last-child {
    padding-bottom: 4px;
  }
`

export const RowComplete = s<Props>(styled.div)`
  ${p => p.active ? activeRow : row}
  line-height: var(--line-height);
  padding-top: 0;
  padding-bottom: 0;
  padding-left: 0;
  padding-right: 8px;
`

// TODO: color use css var instead!
export const RowHeader = s<Props>(styled.div)`
  ${p => p.active ? activeRow : row}
  padding-top: 6px;
  padding-bottom: 6px;
  align-items: center;
  color: #c7c7c7;
  background: var(--background-20);
  ${p => p.active ? `
    color: #fff;
    background: var(--background-b10);
    font-weight: normal;
  ` : ''}
`

export const RowImportant = s<Props>(styled.div)`
  ${row}
  padding-top: 8px;
  padding-bottom: 8px;
  background: var(--background-50);
  color: var(--important);
`

export const RowGroup = styled.div`
  paddingTop: 4px;
  paddingBottom: 4px;
`
