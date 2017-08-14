import { Actions, Events } from '../../utils'
const { h: hs, app } = require('hyperapp')
import { ExtContainer } from '../../api'
import { sub } from '../../dispatch'
import huu from 'huu'
const h = huu(hs)

interface Tab { tab: ExtContainer, name: string }
interface TabInfo { id: number, name: string }
interface State { tabs: TabInfo[], active: number }

const state = { tabs: [], active: -1 }

// TODO: need to resize canvasgrid (smaller) so tabline does not overlay
// TODO: allow options to relocate tabline?
const view = ({ tabs, active }: State) => h('#tabline', {
  style: {
    position: 'absolute',
    display: 'flex',
    bottom: '0',
    right: '0',
  }
}, tabs.map(({ id }, ix) => h('.tab', {
  // TODO: also display name if config declares it to
  key: id,
  css: { active: active === id },
}, ix + 1)))

const a: Actions<State> = {}
a.updateTabs = (_s, _a, { active, tabs }) => ({ active, tabs })

const e: Events<State> = {}
e.updateTabs = (_s, a, d) => a.updateTabs(d)

const pluginUI = app({ state, view, actions: a, events: e })

sub('tabs', async ({ curtab, tabs }: { curtab: ExtContainer, tabs: Tab[] }) => {
  const mtabs: TabInfo[] = tabs.map(t => ({ id: t.tab.id, name: t.name }))
  mtabs.length > 1 && pluginUI('updateTabs', { active: curtab.id, tabs: mtabs })
})
