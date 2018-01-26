import { merge, simplifyPath, absolutePath } from '../support/utils'
import { sub, processAnyBuffered } from '../messaging/dispatch'
import { h, app, style, Actions } from '../ui/uikit'
import configReader from '../config/config-service'
import { onStateChange } from '../core/neovim'
import { ExtContainer } from '../core/api'
import { colors } from '../styles/common'
import Icon from '../components/icon'
import { darken } from '../ui/css'
import '../support/git'

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
  errors: number,
  warnings: number,
  branch: string,
  additions: number,
  deletions: number,
  macro: string,
}

const state: State = {
  tabs: [],
  active: -1,
  filetype: '',
  runningServers: new Set(),
  erroredServers: new Set(),
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
}

// TODO: inherit this from vim colorscheme
const baseColor = '#5989af'

const Statusline = style('div')({
  flex: 1,
  display: 'flex',
  justifyContent: 'space-between',
  background: 'var(--background-30)',
  zIndex: 999,
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
  color: 'var(--foreground-40)',
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
  color: 'var(--foreground-40)',
})

const IconBox = style('div')({
  display: 'flex',
  paddingRight: '4px',
  alignItems: 'center',
})

const container = document.getElementById('statusline') as HTMLElement
merge(container.style, {
  height: '24px',
  display: 'flex',
  zIndex: 900,
})

const view = ({ cwd, line, column, tabs, active, filetype, runningServers, errors, warnings, branch, additions, deletions, macro }: State) => Statusline({}, [
  ,Left({}, [

    ,Item({
      style: {
        color: darken(baseColor, 90),
        background: darken(baseColor, 20),
        paddingRight: '30px',
        marginRight: '-15px',
        clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 100%, 0 100%)',
      }
    }, [
      ,IconBox({}, [ Icon('hard-drive') ])
      ,h('span', cwd || 'no project')
    ])

    // TODO: only show on git projects
    ,Item({
      style: {
        paddingLeft: '30px',
        paddingRight: '30px',
        marginRight: '-15px',
        color: darken(baseColor, 90),
        background: darken(baseColor, 50),
        clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 100%, 15px 100%)',
      }
    }, [
      ,IconBox({
        style: { display: branch ? '' : 'none' }
      }, [ Icon('git-branch') ])

      ,h('span', branch || 'git n/a')
    ])

    // TODO: only show on git projects
    ,Item({
      style: {
        paddingLeft: '30px',
        paddingRight: '30px',
        marginRight: '-15px',
        color: darken(baseColor, 80),
        background: darken(baseColor, 65),
        clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 100%, 15px 100%)',
      }
    }, [
      // ADDITIONS
      ,IconBox({
        style: {
          color: additions > 0 && colors.success,
        }
      }, [
        ,Icon('plus-square')
      ])

      ,h('div', {
        style: { color: additions > 0 && colors.success }
      }, additions)

      // DELETIONS
      ,IconBox({
        style: {
          marginLeft: '12px',
          color: deletions > 0 && colors.error,
        }
      }, [
        ,Icon('minus-square')
      ])

      ,h('div', {
        style: { color: deletions > 0 && colors.error }
      }, deletions)
    ])

    ,runningServers.has(filetype) && Item({}, [
      ,h('div', [
        ,Icon('zap', { color: '#555' })
      ])
    ])

  ])

  ,Center({}, [
    ,macro && Item({}, [
      ,IconBox({
        style: { color: colors.error }
      }, [
        ,Icon('target')
      ])

      ,h('div', {
        style: { color: colors.error }
      }, macro)
    ])

  ])

  ,Right({}, [
    ,Item({
      style: {
        paddingLeft: '30px',
        paddingRight: '30px',
        color: darken(baseColor, 80),
        background: darken(baseColor, 60),
        marginRight: '-15px',
        clipPath: 'polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%)',
      }
    }, [
      // ERRORS
      ,IconBox({
        style: {
          color: errors > 0 && colors.error,
        }
      }, [
        ,Icon('error')
      ])

      ,h('div', {
        style: { color: errors > 0 && colors.error }
      }, errors)

      // WARNINGS
      ,IconBox({
        style: {
          marginLeft: '12px',
          color: warnings > 0 && colors.warning,
        }
      }, [
        ,Icon('warning')
      ])

      ,h('div', {
        style: { color: warnings > 0 && colors.warning }
      }, warnings)
    ])

    ,Item({
      style: {
        paddingLeft: '30px',
        paddingRight: '20px',
        color: darken(baseColor, 90),
        background: darken(baseColor, 40),
        marginRight: '-20px',
        clipPath: 'polygon(15px 0, 100% 0, 100% 100%, 0 100%)',
      }
    }, [
      ,h('div', `${line}:${column}`)
    ])

    ,Item({
      style: {
        paddingRight: '0',
        //clipPath: 'polygon(15px 0, 100% 0, 100% 100%, 0 100%)',
      }
    }, [
      ,tabs.map(({ id }, ix) => Tab({
        // TODO: also display name if config declares it to
        key: id,
        style: active === id ? { 
          background: 'var(--background-10)',
          color: 'var(--foreground)',
        } : undefined
      }, ix + 1))
    ])
  ])
])

const a: Actions<State> = {}
a.updateTabs = (_s, _a, { active, tabs }) => ({ active, tabs })
a.setFiletype = (_s, _a, filetype) => ({ filetype })
a.setLine = (_s, _a, line) => ({ line })
a.setColumn = (_s, _a, column) => ({ column })
a.setCwd = (_s, _a, { cwd, projectRoot }) => ({ cwd, projectRoot })
a.setDiagnostics = (_s, _a, { errors = 0, warnings = 0 }) => ({ errors, warnings })
a.setGitBranch = (_s, _a, branch) => ({ branch })
a.setGitStatus = (_s, _a, { additions, deletions }) => ({ additions, deletions })
a.setMacro = (_s, _a, macro = '') => ({ macro })

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

setImmediate(() => processAnyBuffered('tabs'))
