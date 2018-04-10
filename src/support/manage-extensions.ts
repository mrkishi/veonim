import { EXT_PATH, load as loadExtensions } from '../core/extensions'
import { splitUserRepo } from '../support/dependency-manager'
import { NotifyKind, notify } from '../ui/notifications'
import { downloadRepo } from '../support/download'
import { exists, getDirs } from '../support/utils'
import { remove as removePath } from 'fs-extra'
import { join } from 'path'

interface Extension {
  name: string,
  path: string,
  user: string,
  repo: string,
  installed: boolean,
}

const getExtensions = async (configLines: string[]) => Promise.all(configLines
  .filter(line => /^VeonimExt(\s*)/.test(line))
  .map(line => (line.match(/^VeonimExt(\s*)(?:"|')(\S+)(?:"|')/) || [])[2])
  .map(splitUserRepo)
  .map(async m => {
    const name = `${m.user}-${m.repo}`
    const path = join(EXT_PATH, name)
    return { ...m, name, path, installed: await exists(path) }
  }))

const removeExtraneous = async (extensions: Extension[]) => {
  const dirs = await getDirs(EXT_PATH)
  const extensionInstalled = (path: string) => extensions.some(e => e.name === path)
  const toRemove = dirs.filter(d => !extensionInstalled(d.name))

  toRemove.forEach(ext => removePath(ext.path))
}

export default async (configLines: string[]) => {
  const extensions = await getExtensions(configLines).catch()
  const count = extensions.length
  if (!count) return removeExtraneous(extensions)

  notify(`Found ${count} Veonim extensions. Installing...`, NotifyKind.System)
  await Promise.all(extensions.map(ext => downloadRepo(ext.user, ext.repo, ext.path)))
  notify(`Installed ${count} Veonim extensions!`, NotifyKind.Success)

  removeExtraneous(extensions)
  loadExtensions()
}
