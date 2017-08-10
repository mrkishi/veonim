import { Actions, Events } from '../../utils'
import { sub } from '../../dispatch'
import huu from 'huu'
const { h: hs, app } = require('hyperapp')
const h = huu(hs)

interface Tabpage { val: number }
interface Tab { tab: Tabpage, name: string }
interface TabInfo { id: number, name: string }
interface State { tabs: TabInfo[], active: number }

const state = { tabs: [], active: -1 }

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

sub('tabs', ({ curtab, tabs }: { curtab: Tabpage, tabs: Tab[] }) => {
  const mtabs: TabInfo[] = tabs.map(t => ({ id: t.tab.val, name: t.name }))
  mtabs.length > 1 && pluginUI('updateTabs', { active: curtab.val, tabs: mtabs })
})
