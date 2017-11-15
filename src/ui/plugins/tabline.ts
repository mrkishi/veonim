import { sub, processAnyBuffered } from '../../dispatch'
import { h, app, Actions } from '../uikit'
import { onStateChange } from '../neovim'
import { ExtContainer } from '../../api'

interface Tab { tab: ExtContainer, name: string }
interface TabInfo { id: number, name: string }
interface State { tabs: TabInfo[], active: number, filetype: string, serverRunning: boolean }

const state = { tabs: [], active: -1, filetype: '', serverRunning: false }

// TODO: need to resize canvasgrid (smaller) so tabline does not overlay
// TODO: allow options to relocate tabline?
const view = ({ tabs, active, filetype, serverRunning }: State) => h('#tabline', {
  style: {
    position: 'absolute',
    display: 'flex',
    bottom: '0',
    right: '0',
  }
}, [
  h('.tab', {
    style: { background: '#111' }
  }, filetype),

  h('.tab', {
    style: { background: serverRunning ? 'green' : 'red' }
  }, ''),

  tabs.map(({ id }, ix) => h('.tab', {
    // TODO: also display name if config declares it to
    key: id,
    css: { active: active === id },
  }, ix + 1)),
])

const a: Actions<State> = {}
a.updateTabs = (_s, _a, { active, tabs }) => ({ active, tabs })
a.setFiletype = (_s, _a, filetype) => ({ filetype })
a.setServerRunning = (_s, _a, serverRunning) => ({ serverRunning })

const ui = app({ state, view, actions: a })

sub('tabs', async ({ curtab, tabs }: { curtab: ExtContainer, tabs: Tab[] }) => {
  const mtabs: TabInfo[] = tabs.map(t => ({ id: t.tab.id, name: t.name }))
  mtabs.length > 1
    ? ui.updateTabs({ active: curtab.id, tabs: mtabs })
    : ui.updateTabs({ active: -1, tabs: [] })
})

sub('session:switch', () => ui.updateTabs({ active: -1, tabs: [] }))

onStateChange.filetype(ui.setFiletype)
sub('langserv:start.success', () => ui.setServerRunning(true))
sub('langserv:start.fail', () => ui.setServerRunning(false))
sub('langserv:error', () => ui.setServerRunning(false))
sub('langserv:exit', () => ui.setServerRunning(false))

setImmediate(() => processAnyBuffered('tabs'))
