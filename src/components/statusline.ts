import { merge, simplifyPath, absolutePath } from '../support/utils'
import { sub, processAnyBuffered } from '../messaging/dispatch'
import { onStateChange, getColor } from '../core/neovim'
import configReader from '../config/config-service'
import { darken, brighten, cvar } from '../ui/css'
import { ExtContainer } from '../core/api'
import { colors } from '../styles/common'
import Icon from '../components/icon'
import { h, app } from '../ui/uikit'
import '../support/git'

interface Tab {
  tab: ExtContainer,
  name: string,
}

interface TabInfo {
  id: number,
  name: string,
}

const state = {
  tabs: [] as TabInfo[],
  active: -1,
  filetype: '',
  runningServers: new Set<string>(),
  erroredServers: new Set<string>(),
  mode: 'NORMAL',
  line: 0,
  column: 0,
  cwd: '',
  errors: 0,
  warnings: 0,
  branch: '',
  additions: 0,
  deletions: 0,
  macro: '',
  baseColor: '#6d576a',
}

type S = typeof state

const refreshBaseColor = async () => {
  const { background } = await getColor('StatusLine')
  if (background) ui.setColor(background)
}

const statusGroupStyle = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
}

const itemStyle = {
  color: cvar('foreground-40'),
  display: 'flex',
  height: '100%',
  alignItems: 'center',
  paddingLeft: '20px',
  paddingRight: '20px',
}

const Tab = styled.div`
`

const IconBox = styled.div`
  display: flex;
  padding-right: 4px;
  align-items: center;
`

const container = document.getElementById('statusline') as HTMLElement
merge(container.style, {
  height: '24px',
  display: 'flex',
  zIndex: 900,
})

const actions = {
  updateTabs: ({ active, tabs }: any) => ({ active, tabs }),
  setFiletype: (filetype: any) => ({ filetype }),
  setLine: (line: any) => ({ line }),
  setColumn: (column: any) => ({ column }),
  setCwd: ({ cwd, projectRoot }: any) => ({ cwd, projectRoot }),
  setDiagnostics: ({ errors = 0, warnings = 0 }: any) => ({ errors, warnings }),
  setGitBranch: (branch: any) => ({ branch }),
  setGitStatus: ({ additions, deletions }: any) => ({ additions, deletions }),
  setMacro: (macro = '') => ({ macro }),
  setColor: (baseColor: any) => ({ baseColor }),

  serverRunning: (server: any) => (s: S) => ({
    runningServers: new Set([...s.runningServers, server]),
    erroredServers: new Set([...s.erroredServers].filter(m => m !== server)),
  }),

  serverErrored: (server: any) => (s: S) => ({
    runningServers: new Set([...s.runningServers].filter(m => m !== server)),
    erroredServers: new Set([...s.erroredServers, server]),
  }),

  serverOffline: (server: any) => (s: S) => ({
    runningServers: new Set([...s.runningServers].filter(m => m !== server)),
    erroredServers: new Set([...s.erroredServers].filter(m => m !== server)),
  }),
}

const view = ($: S) => h('div', {
  flex: '1',
  display: 'flex',
  justifyContent: 'space-between',
  background: cvar('background-30'),
  zIndex: '999',
}, [

  // LEFT
  ,h('div', { style: statusGroupStyle }, [

    ,h('div', { style: itemStyle }, {
      style: {
        color: brighten($.baseColor, 90),
        background: darken($.baseColor, 20),
        paddingRight: '30px',
        marginRight: '-15px',
        clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 100%, 0 100%)',
      }
    }, [
      ,h(IconBox, [
        ,Icon('hardDrive')
      ])

      ,h('span', $.cwd || 'no project')
    ])

    // TODO: only show on git projects
    ,h('div', { style: itemStyle }, {
      style: {
        paddingLeft: '30px',
        paddingRight: '30px',
        marginRight: '-15px',
        color: brighten($.baseColor, 40),
        background: darken($.baseColor, 35),
        clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 100%, 15px 100%)',
      }
    }, [
      ,h(IconBox, {
        style: { display: $.branch ? '' : 'none' }
      }, [
        Icon('gitBranch'),
      ])

      ,h('span', $.branch || 'git n/a')
    ])

    // TODO: only show on git projects
    ,h('div', { style: itemStyle }, {
      style: {
        paddingLeft: '30px',
        paddingRight: '30px',
        marginRight: '-15px',
        color: brighten($.baseColor, 10),
        background: darken($.baseColor, 50),
        clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 100%, 15px 100%)',
      }
    }, [
      // ADDITIONS
      ,h(IconBox, {
        style: {
          color: $.additions > 0 && colors.success,
        }
      }, [
        ,Icon('plusSquare')
      ])

      ,h('div', {
        style: { color: $.additions > 0 && colors.success }
      }, `${$.additions}`)

      // DELETIONS
      ,h(IconBox, {
        style: {
          marginLeft: '12px',
          color: $.deletions > 0 && colors.error,
        }
      }, [
        ,Icon('minusSquare')
      ])

      ,h('div', {
        style: { color: $.deletions > 0 && colors.error }
      }, `${$.deletions}`)
    ])

    ,$.runningServers.has($.filetype) && h('div', { style: itemStyle }, [
      ,h('div', [
        ,Icon('zap', { color: '#555' })
      ])
    ])

  ])

  // CENTER
  ,h('div', { statusGroupStyle }, [

    ,$.macro && h('div', { style: itemStyle }, [
      ,h(IconBox, {
        style: { color: colors.error }
      }, [
        ,Icon('target')
      ])

      ,h('div', {
        style: { color: colors.error }
      }, $.macro)
    ])

  ])

  // RIGHT
  ,h('div', { statusGroupStyle }, [

    ,h('div', { style: itemStyle }, {
      style: {
        paddingLeft: '30px',
        paddingRight: '30px',
        color: brighten($.baseColor, 10),
        background: darken($.baseColor, 50),
        marginRight: '-15px',
        clipPath: 'polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%)',
      }
    }, [
      // ERRORS
      ,h(IconBox, {
        style: {
          color: $.errors > 0 && colors.error,
        }
      }, [
        ,Icon('xCircle')
      ])

      ,h('div', {
        style: { color: $.errors > 0 && colors.error }
      }, `${$.errors}`)

      // WARNINGS
      ,h(IconBox, {
        style: {
          marginLeft: '12px',
          color: $.warnings > 0 && colors.warning,
        }
      }, [
        ,Icon('alertTriangle')
      ])

      ,h('div', {
        style: { color: $.warnings > 0 && colors.warning }
      }, `${$.warnings}`)
    ])

    ,h('div', { style: itemStyle }, {
      style: {
        paddingLeft: '30px',
        paddingRight: '20px',
        color: brighten($.baseColor, 60),
        background: darken($.baseColor, 30),
        marginRight: '-20px',
        clipPath: 'polygon(15px 0, 100% 0, 100% 100%, 0 100%)',
      }
    }, [
      ,h('div', `${$.line}:${$.column}`)
    ])

    ,h('div', { style: itemStyle }, {
      style: {
        paddingRight: '0',
        //clipPath: 'polygon(15px 0, 100% 0, 100% 100%, 0 100%)',
      }
    }, [
      ,$.tabs.map(({ id }, ix) => h('div', {
        // TODO: also display name if config declares it to
        key: id,
        style: {
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '8px',
          paddingRight: '8px',
          paddingTop: '4px',
          paddingBottom: '4px',
          color: cvar('foreground-40'),
          ...($.active === id ? {
            background: cvar('background-10'),
            color: cvar('foreground'),
          }: undefined)
        }
      }, ix + 1))
    ])

  ])

])

const ui = app<S, typeof actions>({ name: 'statusline', state, actions, view, element: container })

sub('colorscheme.modified', refreshBaseColor)
onStateChange.colorscheme(refreshBaseColor)
onStateChange.filetype(ui.setFiletype)
onStateChange.line(ui.setLine)
onStateChange.column(ui.setColumn)
onStateChange.cwd((cwd: string) => configReader('project.root', (root: string) => {
  ui.setCwd({ cwd: simplifyPath(cwd, absolutePath(root)) })
}))

sub('tabs', async ({ curtab, tabs }: { curtab: ExtContainer, tabs: Tab[] }) => {
  const mtabs: TabInfo[] = tabs.map(t => ({ id: t.tab.id, name: t.name }))
  mtabs.length > 1
    ? ui.updateTabs({ active: curtab.id, tabs: mtabs })
    : ui.updateTabs({ active: -1, tabs: [] })
})

sub('git:branch', branch => ui.setGitBranch(branch))
sub('git:status', status => ui.setGitStatus(status))
sub('session:switch', () => ui.updateTabs({ active: -1, tabs: [] }))
sub('ai:diagnostics.count', count => ui.setDiagnostics(count))
sub('langserv:start.success', ft => ui.serverRunning(ft))
sub('langserv:start.fail', ft => ui.serverErrored(ft))
sub('langserv:error.load', ft => ui.serverErrored(ft))
sub('langserv:error', ft => ui.serverErrored(ft))
sub('langserv:exit', ft => ui.serverOffline(ft))
sub('vim:macro.start', reg => ui.setMacro(reg))
sub('vim:macro.end', () => ui.setMacro())

setImmediate(() => {
  processAnyBuffered('tabs')
  refreshBaseColor()
})
