import { h, styled } from '../ui/coffee'

const base = `
  z-index: 99;
  display: flex;
  width: 100%;
  justify-content: center;
`

const NormalContainer = styled.div`
  ${base}
  align-items: flex-start;
`

const TopContainer = styled.div`
  ${base}
  align-items: flex-start;
`

const BottomContainer = styled.div`
  ${base}
  align-items: flex-end;
`

const RightContainer = styled.div`
  ${base}
  justify-content: flex-end;
  align-items: stretch;
`

const Dialog = styled.div`
  background: var(--background-40);
  margin-top: 15%;
  flex-flow: column;
`

export const Plugin = (name: string, visible: boolean, children: any[]) => h(NormalContainer, {
  id: name,
}, [

  ,h(Dialog, {
    style: {
      width: '600px',
      display: visible ? 'flex' : 'none',
    }
  }, children)

])

export const PluginTop = (name: string, visible: boolean, children: any[]) => h(TopContainer, {
  id: name,
}, [

  ,h(Dialog, {
    style: {
      width: '400px',
      display: visible ? 'flex' : 'none',
    }
  }, children)

])

export const PluginBottom = (name: string, visible: boolean, children: any[]) => h(BottomContainer, {
  id: name,
}, [

  ,h('div', {
    style: {
      display: visible ? 'flex' : 'none',
    }
  }, children)

])

export const PluginRight = (name: string, visible: boolean, children: any[]) => h(RightContainer, {
  id: name,
}, [

  ,h(Dialog, {
    style: {
      width: '500px',
      height: '100%',
      flexFlow: 'column',
      marginTop: 0,
      display: visible ? 'flex' : 'none',
    }
  }, children)

])
