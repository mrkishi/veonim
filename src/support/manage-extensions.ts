import { EXT_PATH, load as loadExtensions } from '../core/extensions'
import { splitUserRepo } from '../support/dependency-manager'
import { NotifyKind, notify } from '../ui/notifications'
import { downloadRepo } from '../support/download'
import { exists } from '../support/utils'
import { join } from 'path'

const getExtensions = async (configLines: string[]) => Promise.all(configLines
  .filter(line => /^VeonimExt(\s*)/.test(line))
  .map(line => (line.match(/^VeonimExt(\s*)(?:"|')(\S+)(?:"|')/) || [])[2])
  .map(m => {
    console.log('LINE:', m)
    return m
  })
  // .filter(m => typeof m === 'string')
  .map(splitUserRepo)
  .map(async m => {
    const path = join(EXT_PATH, m.repo)
    return { ...m, path, installed: await exists(path) }
  }))

export const removeExtraneous = async () => {
  // const location = dependencyLocations.get(kind)!

  //   const [ dependencies, dirs ] = await Promise.all([
  //     discoverDependencies(kind),
  //     getDirs(location),
  //   ])

  // const installedDependencies = new Set(dependencies.map(p => p.repo))
  // const toRemove = dirs.filter(d => !installedDependencies.has(d.name))
  // const tasks = await Promise.all(toRemove.map(d => removePath(d.path)))
  // return tasks.every(t => !!t)
}

export default async (configLines: string[]) => {
  const extensions = await getExtensions(configLines).catch()
  const count = extensions.length
  if (!count) return removeExtraneous()

  notify(`Found ${count} Veonim extensions. Installing...`, NotifyKind.System)
  await Promise.all(extensions.map(ext => downloadRepo(ext.user, ext.repo, ext.path)))
  notify(`Installed ${count} Veonim extensions!`, NotifyKind.Success)

  removeExtraneous()
  loadExtensions()
}
