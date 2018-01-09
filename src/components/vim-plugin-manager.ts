import { read as readPluginsFromVimrc, install, remove, removeExtraneous, Plugin } from '@veonim/plugin-manager'
import { watchConfig } from '../config/config-reader'
import * as dispatch from '../messaging/dispatch'
import { action, cmd } from '../core/neovim'

// TODO: support other plugin host sites besides github.com?
// TODO: move out of components (no UI) -> services folder?

const installPlugins = async (plugins: Plugin[], { reinstall = false } = {}) => {
  if (!plugins.length) return removeExtraneous()
  dispatch.pub('notification:system', `Found ${plugins.length} Vim plugins. Installing...`)

  if (reinstall) await remove(plugins)
  // TODO: show install progress somehow
  await Promise.all(plugins.map(p => install(p)))
  dispatch.pub('notification:success', `Installed ${plugins.length} Vim plugins!`)

  removeExtraneous()
  cmd(`packloadall!`)
}

const refreshPlugins = () => readPluginsFromVimrc().then(async plugins => installPlugins(plugins.filter(p => !p.installed)))
action('reinstall-plugins', () => readPluginsFromVimrc().then(plugins => installPlugins(plugins, { reinstall: true })))

refreshPlugins()
watchConfig('nvim/init.vim', () => refreshPlugins())
