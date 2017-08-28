import { read, install } from '@veonim/plugin-manager'
import { h, app, Actions } from '../uikit'

interface State { ready: number, total: number, vis: boolean, loading: boolean }
const state = { ready: 0, total: 0, vis: false, loading: false }

const view = ({ ready, total, vis, loading }: State, { hide }: any) => h('#vim-plugins.plugin.top', {
  hide: !vis
}, [
  h('.alert', [
    h('.message', { render: loading }, `Installing ${ready}/${total} Vim plugins...`),
    h('.message', { render: !loading }, `Installed ${total} Vim plugins`),
    h('div', { style: { display: 'flex' } }, [
      h('button', {
        onclick: hide,
        style: { 'flex': 1, }
      }, 'Whatever'),
    ]),
  ])
])

const a: Actions<State> = {}
a.show = (_s, _a, total) => ({ total, vis: true, loading: true })
a.hide = () => ({ ready: 0, total: 0, vis: false, loading: false })
a.installTick = s => ({ ready: s.ready + 1 })
a.done = () => ({ loading: false })

const ui = app({ state, view, actions: a }, false)

read().then(async plugins => {
  const toInstall = plugins.filter(p => !p.installed)
  if (!toInstall.length) return
  ui.show(toInstall.length)
  await Promise.all(toInstall.map(p => install(p).then(() => ui.installTick())))
  ui.done()
  setTimeout(() => ui.hide(), 3e3)
})
