import { read as readPluginsFromVimrc, install, remove, removeExtraneous, Plugin } from '@veonim/plugin-manager'
import { h, app, Actions } from '../uikit'
import { delay } from '../../utils'
import { action } from '../neovim'

interface State { ready: number, total: number, vis: boolean, loading: boolean }
const state = { ready: 0, total: 0, vis: false, loading: false }

const view = ({ ready, total, loading, vis }: State, { hide }: any) => h('#vim-plugins.plugin.top', {
  hide: !vis
}, [
  h('.alert', [
    h('.message', { render: loading }, `Installing ${ready}/${total} Vim plugins...`),
    h('.message', { render: !loading }, `Installed ${total} Vim plugins`),
    h('div', { style: { display: 'flex' } }, [
      h('button', {
        onclick: hide,
        style: { 'flex': 1, }
      }, 'ok, whatever'),
    ]),
  ])
])

const a: Actions<State> = {}
a.show = (_s, _a, total) => ({ total, vis: true, loading: true })
a.hide = () => ({ ready: 0, total: 0, vis: false, loading: false })
a.installTick = s => ({ ready: s.ready + 1 })
a.done = () => ({ loading: false })

const ui = app({ state, view, actions: a }, false)

const installPlugins = async (plugins: Plugin[], { reinstall = false } = {}) => {
  if (!plugins.length) return removeExtraneous()
  ui.show(plugins.length)
  if (reinstall) await remove(plugins)
  await Promise.all(plugins.map(p => install(p).then(() => ui.installTick())))
  ui.done()
  removeExtraneous()
  await delay(3e3)
  ui.hide()
}

readPluginsFromVimrc().then(async plugins => installPlugins(plugins.filter(p => !p.installed)))
action('reinstall-plugins', () => readPluginsFromVimrc().then(plugins => installPlugins(plugins, { reinstall: true })))

// TODO: support other plugin host sites besides github.com?
