import { EXT_PATH, load as loadExtensions } from '../core/extensions'
import { NotifyKind, notify } from '../ui/notifications'
import { exists, getDirs, is } from '../support/utils'
import { downloadRepo } from '../support/download'
import { remove as removePath } from 'fs-extra'
import { join } from 'path'

interface Extension {
  name: string,
  path: string,
  user: string,
  repo: string,
  installed: boolean,
}

const splitUserRepo = (text: string) => {
  const [ , user = '', repo = '' ] = (text.match(/^([^/]+)\/(.*)/) || [])
  return { user, repo }
}

const getExtensions = async (configLines: string[]) => Promise.all(configLines
  .filter(line => /^VeonimExt(\s*)/.test(line))
  .map(line => (line.match(/^VeonimExt(\s*)(?:"|')(\S+)(?:"|')/) || [])[2])
  .filter(is.string)
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

  toRemove.forEach(dir => removePath(dir.path))
}

export default async (configLines: string[]) => {
  const extensions = await getExtensions(configLines).catch()
  const extensionsNotInstalled = extensions.filter(ext => !ext.installed)
  if (!extensionsNotInstalled.length) return removeExtraneous(extensions)

  notify(`Found ${extensionsNotInstalled.length} Veonim extensions. Installing...`, NotifyKind.System)
  await Promise.all(extensions.map(ext => downloadRepo(ext.user, ext.repo, ext.path)))
  notify(`Installed ${extensionsNotInstalled.length} Veonim extensions!`, NotifyKind.Success)

  removeExtraneous(extensions)
  loadExtensions()
}
