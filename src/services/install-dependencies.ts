import { Dependency, DependencyKind, discoverDependencies, install, remove, removeExtraneous } from '../support/dependency-manager'
import { NotifyKind, notify } from '../ui/notifications'
import { watchConfig } from '../config/config-reader'
import { action, cmd } from '../core/neovim'

// TODO: support other plugin host sites besides github.com?
// TODO: show install progress somehow
const installDependencies = async (
  dependencies: Dependency[],
  kind: DependencyKind,
  { reinstall = false } = {},
) => {
  if (!dependencies.length) return removeExtraneous(kind)
  notify(`Found ${dependencies.length} Vim plugins. Installing...`, NotifyKind.System)

  if (reinstall) await remove(dependencies)
  await install(dependencies)
  notify(`Installed ${dependencies.length} Vim plugins!`, NotifyKind.Success)

  removeExtraneous(kind)
  cmd(`packloadall!`)
}

const refreshDependencies = async (kind: DependencyKind) => {
  const dependencies = await discoverDependencies(kind)
  const notInstalled = dependencies.filter(p => !p.installed)
  installDependencies(notInstalled, kind, { reinstall: true })
}

const refreshAllDependencies = () => {
  refreshDependencies(DependencyKind.Plugin)
  refreshDependencies(DependencyKind.Extension)
}

action('reinstall-plugins', () => refreshDependencies(DependencyKind.Plugin))
action('reinstall-extensions', () => refreshDependencies(DependencyKind.Extension))

refreshAllDependencies()
watchConfig('nvim/init.vim', () => refreshAllDependencies())
