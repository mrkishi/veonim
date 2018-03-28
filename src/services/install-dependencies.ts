import { Dependency, DependencyKind, discoverDependencies, install, remove, removeExtraneous } from '../support/dependency-manager'
import { NotifyKind, notify } from '../ui/notifications'
import { watchConfig } from '../config/config-reader'
import * as extensions from '../core/extensions'
import { action, cmd } from '../core/neovim'

const dependencyMessages = new Map<DependencyKind, string>([
  [ DependencyKind.Plugin, 'Vim plugins' ],
  [ DependencyKind.Extension, 'Veonim extensions' ],
])

const depAsString = (kind: DependencyKind) => dependencyMessages.get(kind)!

// TODO: support other plugin host sites besides github.com?
// TODO: show install progress somehow
const installDependencies = async (dependencies: Dependency[], kind: DependencyKind) => {
  if (!dependencies.length) return removeExtraneous(kind)
  notify(`Found ${dependencies.length} ${depAsString(kind)}. Installing...`, NotifyKind.System)

  await remove(dependencies)
  await install(dependencies)
  notify(`Installed ${dependencies.length} ${depAsString(kind)}!`, NotifyKind.Success)

  removeExtraneous(kind)
  if (kind === DependencyKind.Plugin) cmd(`packloadall!`)
  if (kind === DependencyKind.Extension) extensions.load()
}

const refreshDependencies = async (kind: DependencyKind) => {
  const dependencies = await discoverDependencies(kind)
  const notInstalled = dependencies.filter(p => !p.installed)
  installDependencies(notInstalled, kind)
}

const refreshAllDependencies = () => {
  refreshDependencies(DependencyKind.Plugin)
  refreshDependencies(DependencyKind.Extension)
}

action('reinstall-plugins', () => refreshDependencies(DependencyKind.Plugin))
action('reinstall-extensions', () => refreshDependencies(DependencyKind.Extension))

refreshAllDependencies()
watchConfig('nvim/init.vim', refreshAllDependencies)
