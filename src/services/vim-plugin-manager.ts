import { read as readPluginsFromVimrc, install, remove, removeExtraneous, Plugin } from '@veonim/plugin-manager'
import { NotifyKind, notify } from '../ui/notifications'
import { watchConfig } from '../config/config-reader'
import { action, cmd } from '../core/neovim'

// TODO: support other plugin host sites besides github.com?
// TODO: move out of components (no UI) -> services folder?

const installPlugins = async (plugins: Plugin[], { reinstall = false } = {}) => {
  if (!plugins.length) return removeExtraneous()
  notify(`Found ${plugins.length} Vim plugins. Installing...`, NotifyKind.System)

  if (reinstall) await remove(plugins)
  // TODO: show install progress somehow
  await Promise.all(plugins.map(p => install(p)))
  notify(`Installed ${plugins.length} Vim plugins!`, NotifyKind.Success)

  removeExtraneous()
  cmd(`packloadall!`)
}

const refreshPlugins = () => readPluginsFromVimrc().then(async plugins => installPlugins(plugins.filter(p => !p.installed)))
action('reinstall-plugins', () => readPluginsFromVimrc().then(plugins => installPlugins(plugins, { reinstall: true })))

refreshPlugins()
watchConfig('nvim/init.vim', () => refreshPlugins())
