import { configPath, readFile, exists, getDirs } from '../support/utils'
import installExtensions from '../support/manage-extensions'
import { watchConfig } from '../config/config-reader'
import { downloadRepo } from '../support/download'
import { remove as removePath } from 'fs-extra'
import { EXT_PATH } from '../core/extensions'
import { join } from 'path'

export interface Dependency {
  path: string,
  user: string,
  repo: string,
  installPath: string,
  installed: boolean,
}

export enum DependencyKind {
  Plugin,
  Extension,
}

const dependencyLocations = new Map<DependencyKind, string>([
  [ DependencyKind.Plugin, `${configPath}/nvim/pack` ],
  [ DependencyKind.Extension, EXT_PATH ],
])

const dependencyMatchers = new Map<DependencyKind, { filter: RegExp, matcher: RegExp }>([
  [ DependencyKind.Plugin, { filter: /^Plug(\s*)/, matcher: /^Plug(\s*)(?:"|')(\S+)(?:"|')/ } ],
  [ DependencyKind.Extension, { filter: /^VeonimExt(\s*)/, matcher: /^VeonimExt(\s*)(?:"|')(\S+)(?:"|')/ } ],
])

const getFilter = (kind: DependencyKind): RegExp => dependencyMatchers.get(kind)!.filter
const getMatcher = (kind: DependencyKind): RegExp => dependencyMatchers.get(kind)!.matcher

const addInstallStatus = async (deps: Dependency[]): Promise<Dependency[]> =>
  Promise.all(deps.map(async m => ({ ...m, installed: await exists(m.installPath) })))

export const splitUserRepo = (text: string) => {
  console.log('split user repo', text)
  const [ , user = '', repo = '' ] = (text.match(/^([^/]+)\/(.*)/) || [])
  return { user, repo }
}

const vimrcLocation = () => `${configPath}/nvim/init.vim`
const vimrcPath = `${configPath}/nvim/init.vim`

const getVimrcLines = async () => (await readFile(vimrcPath))
  .toString()
  .split('\n')

const parseDependencies = async (kind: DependencyKind) => {
  const vimrcLines = await readFile(vimrcLocation())

  return vimrcLines
    .toString()
    .split('\n')
    .filter(line => getFilter(kind).test(line))
    .map(line => (line.match(getMatcher(kind)) || [])[2])
    .map(splitUserRepo)
}

const getPath = (kind: DependencyKind, dir: string) => {
  const base = dependencyLocations.get(kind)!
  if (kind === DependencyKind.Plugin) return join(base, dir, 'start')
  if (kind === DependencyKind.Extension) return join(base, dir)
  else return join(base, dir)
}

const getInstallPath = (kind: DependencyKind, dir: string) => {
  const base = dependencyLocations.get(kind)!
  if (kind === DependencyKind.Plugin) return join(base, dir, 'start')
  if (kind === DependencyKind.Extension) return join(base, `${dir}-master`)
  else return join(base, dir)
}

export const discoverDependencies = async (kind: DependencyKind): Promise<Dependency[]> => {
  const vimrcExists = await exists(vimrcLocation())
  if (!vimrcExists) return []

  const deps = (await parseDependencies(kind)).map(m => ({
    ...m,
    installed: false,
    installPath: getInstallPath(kind, m.repo),
    path: getPath(kind, m.repo),
  }))

  return addInstallStatus(deps)
}

export const removeExtraneous = async (kind: DependencyKind) => {
  const location = dependencyLocations.get(kind)!

  const [ dependencies, dirs ] = await Promise.all([
    discoverDependencies(kind),
    getDirs(location),
  ])

  const installedDependencies = new Set(dependencies.map(p => p.repo))
  const toRemove = dirs.filter(d => !installedDependencies.has(d.name))
  const tasks = await Promise.all(toRemove.map(d => removePath(d.path)))
  return tasks.every(t => !!t)
}

const downloadDependency = async (dep: Dependency): Promise<Dependency> => {
  await downloadRepo(dep.user, dep.repo, dep.path)
  return { ...dep, installed: true }
}

const removePlugin = async (dep: Dependency) => removePath(dep.path)

export const install = (deps: Dependency[]) => Promise.all(deps.map(downloadDependency))
export const remove = (deps: Dependency[]) => Promise.all(deps.map(removePlugin))

const installPlugins = (configLines: string[]) => {
  const items = configLines
    .filter(line => /^Plug(\s*)/.test(line))
    .map(line => (line.match(/^Plug(\s*)(?:"|')(\S+)(?:"|')/) || [])[2])
    .map(splitUserRepo)
    .map(m => ({
      ...m,
      // installPath: join(m.)

    }))

}

const refreshDependencies = async () => {
  const vimrcExists = await exists(vimrcPath)
  if (!vimrcExists) return

  const configLines = await getVimrcLines()
  installExtensions(configLines)
  installPlugins(configLines)
}

refreshDependencies()
watchConfig('nvim/init.vim', refreshDependencies)
