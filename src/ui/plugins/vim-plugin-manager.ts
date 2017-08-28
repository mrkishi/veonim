import { read as readPluginsFromVimrc, install, remove, removeExtraneous, Plugin } from '@veonim/plugin-manager'
import { watchConfig } from '../../config-reader'
import { h, app, Actions } from '../uikit'
import { action, cmd } from '../neovim'
import { delay } from '../../utils'

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
  cmd(`packloadall`)
  await delay(3e3)
  ui.hide()
}

const refreshPlugins = () => readPluginsFromVimrc().then(async plugins => installPlugins(plugins.filter(p => !p.installed)))
action('reinstall-plugins', () => readPluginsFromVimrc().then(plugins => installPlugins(plugins, { reinstall: true })))

refreshPlugins()
watchConfig('nvim/init.vim', () => refreshPlugins())

// TODO: support other plugin host sites besides github.com?
