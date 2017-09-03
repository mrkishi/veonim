// TODO: TS pls?
const jayson = require('jayson')
import { getType } from './files'
const { getPort } = require('portfinder')
import { spawn } from 'child_process'
import defaultCapabs from './capabilities'
import { onFnCall, merge, toJSON } from './utils'

const servers = new Map()
const serverConfigs = new Map()
const getServer = (cwd, type) => servers.get(`${cwd}::${type}`)
const setServer = (cwd, type, stuff) => servers.set(`${cwd}::${type}`, stuff)

const derp = (e: any) => console.error(e)
export const register = (type, cmd) => serverConfigs.set(type, cmd)
const getOpenPort = m => new Promise((ok, no) => getPort((e, r) => e ? no(e) : ok(r)))

const sleep = t => new Promise(d => setTimeout(d, t))

const startServer = async (cwd, type) => {
  if (!serverConfigs.has(type)) throw `no language server configured for ${type}`

  const cmd = serverConfigs.get(type)
  const port = await getOpenPort().catch(derp)
  const patchedCmd = cmd.replace('$$$$', port).split(' ')
  const [ program, ...args ] = patchedCmd
  const serverProcess = spawn(program, args)

  serverProcess.stdout.pipe(process.stdout)
  serverProcess.stderr.pipe(process.stderr)

  await sleep(2000)

  const rpc = jayson.client.tcp({ port })
  const call = (m, ...a) => new Promise((y, n) => rpc.request(m, a, (e, r) => e ? n(e) : y(r)))

  const res = await call('initialize', defaultCapabs(cwd)).catch(derp)
  if (!res) throw 'failed to initalize server ${cmd}'
  if (res.error) throw `initalize err: ${toJSON(res.error)}`
  call('initialized')

  return { serverProcess, rpc, call, canDo: res.result.capabilities }
}

const loadServer = async (cwd, type) => {
  const server = await startServer(cwd, type).catch(derp)
  setServer(cwd, type, server)
  return server
}

// TODO: multiple servers can serve the same lang. should query multiple
// i.e. tern for basic, maybe typescript for some stuff, eslint for formatting/errors (all JS)
const canDoMethod = ({ canDo }, ns, fn) => {
  const saveOpts = {
    'textDocument/didOpen': 'openClose',
    'textDocument/didClose': 'openClose',
    'textDocument/didChange': 'change',
    'textDocument/didSave': 'save',
    'textDocument/willSave': 'willSave',
    'textDocument/willSaveWaitUntil': 'willSaveWaitUntil'
  }

  const save = saveOpts[`${ns}/${fn}`]

  return canDo[`${fn}Provider`]
    || canDo[`${ns + fn}Provider`]
    || save && (canDo || {}).textDocumentSync[save]
}

const registerDynamicCaller = namespace => onFnCall(async (method, req) => {
  const { cwd, language } = req

  const server = getServer(cwd, language) || await loadServer(cwd, language)
  if (!server) {
    derp(`could not load server type:${language} cwd:${cwd}`)
    return {}
  }

  if (!canDoMethod(server, namespace, method)) {
    derp(`server does not support ${namespace}/${method}`)
    return {}
  }

  const { error, result } = await server.call(`${namespace}/${method}`, req).catch(derp)
  if (error) derp(`failed ${namespace}/${method} with error: ${toJSON(error)}`)
  return result
})

export const cancelRequest = m => call('$/cancelRequest', m)
export const client = registerDynamicCaller('client')
export const workspace = registerDynamicCaller('workspace')
export const completionItem = registerDynamicCaller('completionItem')
export const codeLens = registerDynamicCaller('codeLens')
export const documentLink = registerDynamicCaller('documentLink')
export const window = registerDynamicCaller('window')
export const textDocument = registerDynamicCaller('textDocument')
export const telemetry = registerDynamicCaller('telemetry')
