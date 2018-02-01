import { configPath, readFile, exists, getDirs } from '../support/utils'
import { downloadRepo } from '../support/download'
import removePath from 'nimraf'
import { join } from 'path'

export interface Dependency {
  path: string,
  user: string,
  repo: string,
  installed: boolean,
}

export enum DependencyKind {
  Plugin,
  Extension,
}

const dependencyLocations = new Map<DependencyKind, string>([
  [ DependencyKind.Plugin, `${configPath}/nvim/pack` ],
  [ DependencyKind.Extension, `${configPath}/veonim/extensions` ],
])

const dependencyMatchers = new Map<DependencyKind, { filter: RegExp, matcher: RegExp }>([
  [ DependencyKind.Plugin, { filter: /^Plug(\s*)/, matcher: /^Plug(\s*)(?:"|')(\S+)(?:"|')/ } ],
  [ DependencyKind.Extension, { filter: /^VeonimExt(\s*)/, matcher: /^VeonimExt(\s*)(?:"|')(\S+)(?:"|')/ } ],
])

const getFilter = (kind: DependencyKind): RegExp => dependencyMatchers.get(kind)!.filter
const getMatcher = (kind: DependencyKind): RegExp => dependencyMatchers.get(kind)!.matcher

const addInstallStatus = async (deps: Dependency[]): Promise<Dependency[]> =>
  Promise.all(deps.map(async m => ({ ...m, installed: await exists(m.path) })))

const splitUserRepo = (text: string) => {
  const [ , user = '', repo = '' ] = (text.match(/^([^/]+)\/(.*)/) || [])
  return { user, repo }
}

const parseDependencies = async (kind: DependencyKind) => {
  const vimrcLines = await readFile(`${configPath}/nvim/init.vim`)

  return vimrcLines
    .toString()
    .split('\n')
    .filter(line => getFilter(kind).test(line))
    .map(line => (line.match(getMatcher(kind)) || [])[2])
    .map(splitUserRepo)
}

export const discoverDependencies = async (kind: DependencyKind): Promise<Dependency[]> => {
  const deps = (await parseDependencies(kind)).map(m => ({
    ...m,
    installed: false,
    path: join(dependencyLocations.get(kind)!, m.repo),
  }))

  return addInstallStatus(deps)
}

export const removeExtraneous = async (kind: DependencyKind) => {
  const [ dependencies, dirs ] = await Promise.all([
    discoverDependencies(kind),
    getDirs(`${configPath}/nvim/pack`)
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

const removePlugin = async (dep: Dependency): Promise<boolean> => removePath(dep.path)

export const install = (deps: Dependency[]) => Promise.all(deps.map(downloadDependency))
export const remove = (deps: Dependency[]) => Promise.all(deps.map(removePlugin))
