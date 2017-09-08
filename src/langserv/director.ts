import { startServerFor, hasServerFor } from './servers'
import defaultCapabs from './capabilities'
import { getPort } from 'portfinder'
import { onFnCall } from '../utils'
import { Server } from './channel'

const getOpenPort = (): Promise<number> => new Promise((ok, no) => getPort((e, r) => e ? no(e) : ok(r)))

interface ActiveServer extends Server {
  canDo: {
    result: {
      capabilities: any[]
    }
  }
}

const servers = new Map()
const runningServers = {
  get: (cwd: string, type: string) => servers.get(`${cwd}::${type}`),
  add: (cwd: string, type: string, server: ActiveServer) => servers.set(`${cwd}::${type}`, server),
}

const derp = (e: any) => console.error(e)

const startServer = async (cwd: string, type: string): Promise<ActiveServer> => {
  if (!hasServerFor(type)) throw `no language server configured for ${type}`

  // TODO: might not be able to connect to server right away, do incremental backoff on client connect
  const port = await getOpenPort().catch(derp)
  if (!port) throw `failed to get open port wtf lol`
  const server = startServerFor(type, port)
  const { request, notify, on, onError } = server

  const res = await request('initialize', defaultCapabs(cwd)).catch(derp)
  if (!res) throw `failed to initalize server ${type}`
  if (res.error) throw `initalize err: ${JSON.stringify(res.error)}`
  notify('initialized')

  return { request, notify, on, onError, canDo: res.result.capabilities }
}

const loadServer = async (cwd: string, type: string) => {
  const server = await startServer(cwd, type).catch(derp)
  if (!server) return
  runningServers.add(cwd, type, server)
  return server
}

const saveOpts = new Map<string, string>([
  ['textDocument/didOpen', 'openClose'],
  ['textDocument/didClose', 'openClose'],
  ['textDocument/didChange', 'change'],
  ['textDocument/didSave', 'save'],
  ['textDocument/willSave', 'willSave'],
  ['textDocument/willSaveWaitUntil', 'willSaveWaitUntil'],
])

// TODO: multiple servers can serve the same lang. should query multiple
// i.e. tern for basic, maybe typescript for some stuff, eslint for formatting/errors (all JS)
const canDoMethod = ({ canDo }: ActiveServer, ns: string, fn: string) => {
  const save = saveOpts.get(`${ns}/${fn}`)

  return canDo[`${fn}Provider`]
    || canDo[`${ns + fn}Provider`]
    || save && (canDo || {}).textDocumentSync[save]
}

const registerDynamicCaller = (namespace: string) => onFnCall(async (method, req: any) => {
  const { cwd, language } = req

  const server = runningServers.get(cwd, language) || await loadServer(cwd, language)
  if (!server) {
    derp(`could not load server type:${language} cwd:${cwd}`)
    return {}
  }

  if (!canDoMethod(server, namespace, method)) {
    derp(`server does not support ${namespace}/${method}`)
    return {}
  }

  const { error, result } = await server.call(`${namespace}/${method}`, req).catch(derp)
  if (error) derp(`failed ${namespace}/${method} with error: ${JSON.stringify(error)}`)
  return result
})

//TODO: lolwut???
//export const cancelRequest = (id: string | number) => call('$/cancelRequest', id)
export const client = registerDynamicCaller('client')
export const workspace = registerDynamicCaller('workspace')
export const completionItem = registerDynamicCaller('completionItem')
export const codeLens = registerDynamicCaller('codeLens')
export const documentLink = registerDynamicCaller('documentLink')
export const window = registerDynamicCaller('window')
export const textDocument = registerDynamicCaller('textDocument')
export const telemetry = registerDynamicCaller('telemetry')
