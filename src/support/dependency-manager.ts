import { configPath, readFile, exists, getDirs } from '../support/utils'
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

const splitUserRepo = (text: string) => {
  const [ , user = '', repo = '' ] = (text.match(/^([^/]+)\/(.*)/) || [])
  return { user, repo }
}

const vimrcLocation = () => `${configPath}/nvim/init.vim`

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
