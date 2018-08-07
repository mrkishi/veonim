import { PluginRight } from '../components/plugin-container'
import { DebugProtocol as DP } from 'vscode-debugprotocol'
import { paddingVH } from '../ui/css'
import { h, app } from '../ui/uikit'

type Threads = DP.Thread[]
type Stacks = DP.StackFrame[]
type Scopes = DP.Scope[]
type Variables = DP.Variable[]

const state = {
  visible: false,
  threads: [] as Threads,
  stacks: [] as Stacks,
  scopes: [] as Scopes,
  variables: [] as Variables,
  activeThread: 0,
  activeStack: 0,
  activeScope: 0,
  activeVar: 0,
}

type S = typeof state

const actions = {
  show: () => ({ visible: true }),
  hide: () => ({ visible: false }),
  updateState: (m: any) => m,
}

type A = typeof actions

const header = (title: string) => h('div', {
  style: {
    ...paddingVH(8, 8),
    background: 'rgba(255, 255, 255, 0.1)',
    fontWeight: 'bold',
  },
}, title)

interface Item {
  name: string
  id: number
}

const ListItemererer = (a: A) => (item: Item, kind: string) => h('div', {
  style: {
    ...paddingVH(8, 4),
  },
  onclick: () => console.log('PLS MAKE:', kind, item.id)
}, item.name)

const view = ($: S, a: A) => {
  const ListItem = ListItemererer(a)

  return PluginRight($.visible, [

    ,h('div', [
      ,header('Threads')
      ,h('div', $.threads.map(m => ListItem(m, 'threads')))
    ])

    ,h('div', [
      ,header('Stacks')
      ,h('div', $.stacks.map(m => ListItem(m, 'stacks')))
    ])

    ,h('div', [
      ,header('Scopes')
      ,h('div', $.scopes.map(m => ListItem(m, 'scopes')))
    ])

    ,h('div', [
      ,header('Variables')
      ,h('div', $.variables.map(m => ListItem(m, 'variables')))
    ])

  ])
}

export default app<S, A>({ name: 'debugger', state, actions, view })
