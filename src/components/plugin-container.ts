import { h, styled } from '../ui/coffee'

const base = `
  z-index: 99;
  display: flex;
  width: 100%;
  justify-content: center;
  background: var(--background-40);
  margin-top: 15%;
`

const NormalContainer = styled.div`
  ${base}
  align-items: flex-start;
  width: 600px;
`

const TopContainer = styled.div`
  ${base}
  align-items: flex-start;
  width: 400px;
`

const BottomContainer = styled.div`
  ${base}
  align-items: flex-end;
`

const RightContainer = styled.div`
  ${base}
  flex-flow: column;
  justify-content: flex-end;
  align-items: stretch;
  height: 100%;
  width: 500px;
  margin-top: 0;
`

export const PluginNormal = (name: string, visible: boolean, children: any[]) => h(NormalContainer, {
  id: name,
  style: {
    display: visible ? 'flex' : 'none',
  }
}, children)

export const PluginTop = (name: string, visible: boolean, children: any[]) => h(TopContainer, {
  id: name,
  style: {
    display: visible ? 'flex' : 'none',
  }
}, children)

export const PluginBottom = (name: string, visible: boolean, children: any[]) => h(BottomContainer, {
  id: name,
  style: {
    display: visible ? 'flex' : 'none',
  }
}, children)

export const PluginRight = (name: string, visible: boolean, children: any[]) => h(RightContainer, {
  id: name,
  style: {
    display: visible ? 'flex' : 'none',
  }
}, children)
