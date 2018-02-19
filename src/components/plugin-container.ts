import { styled } from '../ui/coffee'

const base = `
  z-index: 99;
  display: flex;
  width: 100%;
  justify-content: center;
  background: var(--background-40);
  margin-top: 15%;
`

export const normal = styled.div`
  ${base}
  align-items: flex-start;
  width: 600px;
`

export const top = styled.div`
  ${base}
  align-items: flex-start;
  width: 400px;
`

export const bottom = styled.div`
  ${base}
  align-items: flex-end;
`

export const right = styled.div`
  ${base}
  flex-flow: column;
  justify-content: flex-end;
  align-items: stretch;
  height: 100%;
  width: 500px;
  margin-top: 0;
`
