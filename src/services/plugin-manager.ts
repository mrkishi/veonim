import { is, configPath, readFile, exists, getDirs } from '../support/utils'
import { downloadRepo } from '../support/download'
import removePath from 'nimraf'

export interface InstallResult {
  name: string
}

export interface Plugin {
  path: string,
  user: string,
  repo: string,
  installed: boolean,
}

const addInstallStatus = async (plugs: Plugin[]): Promise<Plugin[]> =>
  Promise.all(plugs.map(async m => ({ ...m, installed: await exists(m.path) })))

const splitUserRepo = (text: string) => {
  const [ , user = '', repo = '' ] = (text.match(/^([^/]+)\/(.*)/) || [])
  return { user, repo }
}

const parsePlugins = async () => {
  const vimrcLines = await readFile(`${configPath}/nvim/init.vim`)
  return vimrcLines
    .toString()
    .split('\n')
    .filter(line => /^Plug(\s*)/.test(line))
    .map(line => (line.match(/^Plug(\s*)(?:"|')(\S+)(?:"|')/) || [])[2])
    .map(splitUserRepo)
}

export const read = async (): Promise<Plugin[]> => {
  const plugins = await parsePlugins()

  const plugs = plugins.map(m => ({
    ...m,
    installed: false,
    path: `${configPath}/nvim/pack/${m.repo}`
  }))

  return addInstallStatus(plugs)
}

export const removeExtraneous = async () => {
  const [ plugins, dirs ] = await Promise.all([read(), getDirs(`${configPath}/nvim/pack`)])
  const installedPlugins = new Set(plugins.map(p => p.repo))
  const toRemove = dirs.filter(d => !installedPlugins.has(d.name))
  const tasks = await Promise.all(toRemove.map(d => removePath(d.path)))
  return tasks.every(t => !!t)
}

const downloadPlugin = async (plugin: Plugin) => {
  await downloadRepo(plugin.user, plugin.repo, plugin.path)
  return { ...plugin, installed: true }
}

type InstallPlugin = (plugin: Plugin) => Promise<InstallResult>
type InstallPlugins = (plugins: Plugin[]) => Promise<InstallResult[]>
type Install = InstallPlugin & InstallPlugins

const install: Install = (plugins: Plugin | Plugin[]) => is.array(plugins)
  ? Promise.all(plugins.map(downloadPlugin))
  : downloadPlugin(plugins)

//function install(plugins: Plugin): Promise<InstallResult | InstallResult[]>
//function install(plugins: Plugin[]): Promise<InstallResult | InstallResult[]>
//function install(plugins: any): Promise<InstallResult | InstallResult[]> {
  //return Array.isArray(plugins)
    //? Promise.all(plugins.map(download))
    //: download(plugins)
//}

function remove(plugins: Plugin): Promise<boolean | boolean[]>
function remove(plugins: Plugin[]): Promise<boolean | boolean[]>
function remove(plugins: any): Promise<boolean | boolean[]> {
  return is.array(plugins)
    ? Promise.all(plugins.map((p: Plugin) => p.path).map(async (path: string) => removePath(path)))
    : removePath(plugins.path)
}

export { install, remove }
