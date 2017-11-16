import { sub, processAnyBuffered } from '../../dispatch'
import { h, app, Actions } from '../uikit'
import { onStateChange } from '../neovim'
import { ExtContainer } from '../../api'
import { match } from '../../utils'

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
}

const state = {
  tabs: [],
  active: -1,
  filetype: '',
  runningServers: new Set(),
  erroredServers: new Set(),
}

// TODO: need to resize canvasgrid (smaller) so tabline does not overlay
// TODO: allow options to relocate tabline?
const view = ({ tabs, active, filetype, runningServers, erroredServers }: State) => h('#tabline', {
  style: {
    position: 'absolute',
    display: 'flex',
    bottom: '0',
    right: '0',
  }
}, [
  h('.tab', {
    hide: !filetype,
    style: {
      background: 'rgba(0, 0, 0, 0.2)',
      color: match(
        [runningServers.has(filetype), 'rgba(129, 255, 0, 0.4)'],
        [erroredServers.has(filetype), 'rgba(255, 47, 9, 0.4)'],
      )
    }
  }, filetype),

  tabs.map(({ id }, ix) => h('.tab', {
    // TODO: also display name if config declares it to
    key: id,
    css: { active: active === id },
  }, ix + 1)),
])

const a: Actions<State> = {}
a.updateTabs = (_s, _a, { active, tabs }) => ({ active, tabs })
a.setFiletype = (_s, _a, filetype) => ({ filetype })

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

const ui = app({ state, view, actions: a })

sub('tabs', async ({ curtab, tabs }: { curtab: ExtContainer, tabs: Tab[] }) => {
  const mtabs: TabInfo[] = tabs.map(t => ({ id: t.tab.id, name: t.name }))
  mtabs.length > 1
    ? ui.updateTabs({ active: curtab.id, tabs: mtabs })
    : ui.updateTabs({ active: -1, tabs: [] })
})

sub('session:switch', () => ui.updateTabs({ active: -1, tabs: [] }))

onStateChange.filetype(ui.setFiletype)
sub('langserv:start.success', ft => ui.serverRunning(ft))
sub('langserv:start.fail', ft => ui.serverErrored(ft))
sub('langserv:error.load', ft => ui.serverErrored(ft))
sub('langserv:error', ft => ui.serverErrored(ft))
sub('langserv:exit', ft => ui.serverOffline(ft))

setImmediate(() => processAnyBuffered('tabs'))
