import { is } from '../support/utils'
import { createGunzip } from 'zlib'
import removePath from 'nimraf'
import * as http from 'http'
import { homedir } from 'os'
import { join } from 'path'
import * as fs from 'fs'

type ReadFile = (path: string) => Promise<Buffer>
export interface InstallResult { name: string }
export interface Plugin {
  url: string,
  path: string,
  user: string,
  repo: string,
  installed: boolean,
  blarg(one: string): number,
}

const request = (url: string) => new Promise(fin => http.get(url, fin))
const onFnCall = <T>(cb: (name: string, args: any[]) => void): T => new Proxy({}, { get: (_, name) => (...args: any[]) => cb(name as string, args) }) as T
const promisifyApi = <T>(o: object): T => onFnCall<T>((name: string, args: any[]) => new Promise((ok, no) => {
  const theFunctionToCall: Function = Reflect.get(o, name)
  theFunctionToCall(...args, (err: Error, res: any) => err ? no(err) : ok(res))
}))

const { readFile: fsrf, readdir, stat } = promisifyApi(fs)
const readFile: ReadFile = fsrf
const exists = (path: string): Promise<boolean> => new Promise(fin => fs.access(path, e => fin(!e)))

const getDirs = async (path: string) => {
  const paths = await readdir(path) as string[]
  const filepaths = paths.map(f => ({ name: f, path: join(path, f) }))
  const filesreq = await Promise.all(filepaths.map(async f => ({
    path: f.path,
    name: f.name,
    stats: await stat(f.path).catch((_e: string) => ({ isDirectory: () => false }))
  })))
  return filesreq
    .filter(m => m.stats.isDirectory())
    .map(({ name, path }) => ({ name, path }))
}

const $HOME = homedir()
const base = process.env.XDG_CONFIG_HOME || (process.platform === 'win32'
  ? `${$HOME}/AppData/Local/nvim`
  : `${$HOME}/.config/nvim`)

const vimpath = `${base}/init.vim`

const parsePlugins = (path: string) => readFile(path).then(f => f
  .toString()
  .split('\n')
  .filter(line => /^Plug(\s*)/.test(line))
  .map(line => (line.match(/^Plug(\s*)(?:"|')(\S+)(?:"|')/) || [])[2]))

const splitUserRepo = (m: string) => {
  const [ , user = '', repo = '' ] = (m.match(/^([^/]+)\/(.*)/) || [])
  return { user, repo }
}

// TODO: assumes master branch...
const addUrl = (m: Plugin): Plugin => ({ ...m, url: `https://github.com/${m.user}/${m.repo}/tarball/master` })
const addPath = (p: string) => (m: Plugin): Plugin => ({ ...m, path: `${p}/${m.repo}/start` })
const addInstallStatus = async (plugs: Plugin[]): Promise<Plugin[]> => Promise.all(plugs.map(async m => ({ ...m, installed: await exists(m.path) })))

const download = ({ url, path, user, repo }: Plugin): Promise<InstallResult> => new Promise(fin => request(url).then((stream: NodeJS.ReadableStream) => {
  const writeStream = fs.createWriteStream(path)
  const unzipper = createGunzip()
  stream.pipe(unzipper).pipe(writeStream).on('close', () => {
    fin({ name: `${user}/${repo}` } as InstallResult)
  })
}))

export const read = async (): Promise<Plugin[]> => {
  const plugins = await parsePlugins(vimpath)
  const plugs = plugins
    .map(splitUserRepo)
    .map(addUrl)
    .map(addPath(`${base}/pack`))

  return await addInstallStatus(plugs)
}

export const removeExtraneous = async () => {
  const [ plugins, dirs ] = await Promise.all([read(), getDirs(`${base}/pack`)])
  const installedPlugins = new Set(plugins.map(p => p.repo))
  const toRemove = dirs.filter(d => !installedPlugins.has(d.name))
  const tasks = await Promise.all(toRemove.map(d => removePath(d.path)))
  return tasks.every(t => !!t)
}

function install(plugins: Plugin): Promise<InstallResult | InstallResult[]>
function install(plugins: Plugin[]): Promise<InstallResult | InstallResult[]>
function install(plugins: any): Promise<InstallResult | InstallResult[]> {
  return Array.isArray(plugins)
    ? Promise.all(plugins.map(download))
    : download(plugins)
}

function remove(plugins: Plugin): Promise<boolean | boolean[]>
function remove(plugins: Plugin[]): Promise<boolean | boolean[]>
function remove(plugins: any): Promise<boolean | boolean[]> {
  return is.array(plugins)
    ? Promise.all(plugins.map((p: Plugin) => p.path).map(async (path: string) => removePath(path)))
    : removePath(plugins.path)
}

export { install, remove }

