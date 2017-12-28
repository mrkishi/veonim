import { sub, processAnyBuffered } from '../messaging/dispatch'
import { h, app, style, Actions } from '../ui/uikit'
import { onStateChange } from '../core/neovim'
import { ExtContainer } from '../core/api'
import { merge } from '../support/utils'
import Icon from '../components/icon'

interface Tab {
  tab: ExtContainer,
  name: string,
}

interface TabInfo {
  id: number,
  name: string,
}

interface State {
  tabs: TabInfo[],
  active: number,
  filetype: string,
  runningServers: Set<string>,
  erroredServers: Set<string>,
  mode: string,
  line: number,
  column: number,
  cwd: string,
}

const state = {
  tabs: [],
  active: -1,
  filetype: '',
  runningServers: new Set(),
  erroredServers: new Set(),
  mode: 'NORMAL',
  line: 0,
  column: 0,
  cwd: '',
}

const Statusline = style('div')({
  flex: 1,
  display: 'flex',
  justifyContent: 'space-between',
  background: '#222',
})

const lineGroup = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
}

const Left = style('div')(lineGroup)
const Center = style('div')(lineGroup)
const Right = style('div')(lineGroup)

const Item = style('div')({
  color: '#777',
  display: 'flex',
  height: '100%',
  alignItems: 'center',
  paddingLeft: '20px',
  paddingRight: '20px',
})

const Tab = style('div')({
  display: 'flex',
  alignItems: 'center',
  paddingLeft: '8px',
  paddingRight: '8px',
  paddingTop: '4px',
  paddingBottom: '4px',
  color: '#aaa',
})

const container = document.getElementById('statusline') as HTMLElement
merge(container.style, {
  height: '24px',
  display: 'flex',
  'z-index': 240,
})

// TODO: LOL NOPE
const $PR = `/Users/a/Documents/projects/`

const view = ({ mode, cwd, line, column, tabs, active, filetype, runningServers }: State) => Statusline({}, [
  ,Left({}, [
    ,Item({
      style: {
        color: '#eee',
        background: 'rgb(74, 55, 83)',
        paddingRight: '30px',
        clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 100%, 0 100%)',
      }
    }, mode.toUpperCase())

    ,Item({
    }, [
      ,h('div', {
        hide: !runningServers.has(filetype),
        style: {
          paddingRight: '4px',
        }
      }, [
        ,Icon('zap')
      ])

      ,h('span', filetype || 'empty')
    ])

    ,Item({
      style: {
        paddingLeft: '36px',
        paddingRight: '36px',
        background: '#2a2a2a',
        clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 100%, 15px 100%)',
      }
    }, cwd.replace($PR, '') || 'no project')
  ])

  ,Center({}, [])

  ,Right({}, [
    ,Item({
      style: {
        paddingLeft: '36px',
        paddingRight: '26px',
        background: '#342d35',
        marginRight: '-20px',
        clipPath: 'polygon(15px 0, 100% 0, 100% 100%, 0 100%)',
        //clipPath: 'polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%)',
      }
    }, [
      ,h('div', `${line}:${column}`)
    ])

    ,Item({
      style: {
        paddingRight: '0',
        background: '#2a2a2a',
        //clipPath: 'polygon(15px 0, 100% 0, 100% 100%, 0 100%)',
      }
    }, [
      ,tabs.map(({ id }, ix) => Tab({
        // TODO: also display name if config declares it to
        key: id,
        style: active === id ? { 
          background: '#333',
          color: '#ddd',
        } : undefined
      }, ix + 1))
    ])
  ])
])

const a: Actions<State> = {}
a.updateTabs = (_s, _a, { active, tabs }) => ({ active, tabs })
a.setFiletype = (_s, _a, filetype) => ({ filetype })
a.setMode = (_s, _a, mode) => ({ mode })
a.setLine = (_s, _a, line) => ({ line })
a.setColumn = (_s, _a, column) => ({ column })
a.setCwd = (_s, _a, cwd) => ({ cwd })

a.serverRunning = (s, _a, server) => ({
  runningServers: new Set([...s.runningServers, server]),
  erroredServers: new Set([...s.erroredServers].filter(m => m !== server)),
})

a.serverErrored = (s, _a, server) => ({
  runningServers: new Set([...s.runningServers].filter(m => m !== server)),
  erroredServers: new Set([...s.erroredServers, server]),
})

a.serverOffline = (s, _a, server) => ({
  runningServers: new Set([...s.runningServers].filter(m => m !== server)),
  erroredServers: new Set([...s.erroredServers].filter(m => m !== server)),
})

const ui = app({ state, view, actions: a }, false, container)

sub('tabs', async ({ curtab, tabs }: { curtab: ExtContainer, tabs: Tab[] }) => {
  const mtabs: TabInfo[] = tabs.map(t => ({ id: t.tab.id, name: t.name }))
  mtabs.length > 1
    ? ui.updateTabs({ active: curtab.id, tabs: mtabs })
    : ui.updateTabs({ active: -1, tabs: [] })
})

sub('session:switch', () => ui.updateTabs({ active: -1, tabs: [] }))
sub('vim:mode', ui.setMode)

onStateChange.filetype(ui.setFiletype)
onStateChange.cwd(ui.setCwd)
onStateChange.line(ui.setLine)
onStateChange.column(ui.setColumn)

sub('langserv:start.success', ft => ui.serverRunning(ft))
sub('langserv:start.fail', ft => ui.serverErrored(ft))
sub('langserv:error.load', ft => ui.serverErrored(ft))
sub('langserv:error', ft => ui.serverErrored(ft))
sub('langserv:exit', ft => ui.serverOffline(ft))

setImmediate(() => processAnyBuffered('tabs'))
