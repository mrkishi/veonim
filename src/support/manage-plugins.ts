import { exists, getDirs, is, configPath } from '../support/utils'
import { NotifyKind, notify } from '../ui/notifications'
import { downloadRepo } from '../support/download'
import { remove as removePath } from 'fs-extra'
import { cmd } from '../core/neovim'
import { join } from 'path'

interface Plugin {
  name: string,
  path: string,
  user: string,
  repo: string,
  installed: boolean,
}

const packDir = join(configPath, 'nvim/pack')

const splitUserRepo = (text: string) => {
  const [ , user = '', repo = '' ] = (text.match(/^([^/]+)\/(.*)/) || [])
  return { user, repo }
}

const getPlugins = async (configLines: string[]) => Promise.all(configLines
  .filter(line => /^Plug(\s*)/.test(line))
  .map(line => (line.match(/^Plug(\s*)(?:"|')(\S+)(?:"|')/) || [])[2])
  .filter(is.string)
  .map(splitUserRepo)
  .map(async m => {
    const name = `${m.user}-${m.repo}`
    const path = join(packDir, name)
    return { ...m, name, path, installed: await exists(path) }
  }))

const removeExtraneous = async (plugins: Plugin[]) => {
  const dirs = await getDirs(packDir)
  const pluginInstalled = (path: string) => plugins.some(e => e.name === path)
  const toRemove = dirs.filter(d => !pluginInstalled(d.name))

  toRemove.forEach(dir => removePath(dir.path))
}

export default async (configLines: string[]) => {
  const plugins = await getPlugins(configLines).catch()
  const pluginsNotInstalled = plugins.filter(ext => !ext.installed)
  if (!pluginsNotInstalled.length) return removeExtraneous(plugins)

  notify(`Found ${pluginsNotInstalled.length} Veonim plugins. Installing...`, NotifyKind.System)
  await Promise.all(plugins.map(ext => downloadRepo(ext.user, ext.repo, ext.path)))
  notify(`Installed ${pluginsNotInstalled.length} Veonim plugins!`, NotifyKind.Success)

  removeExtraneous(plugins)
  cmd(`packloadall!`)
}
