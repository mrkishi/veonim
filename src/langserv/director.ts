import { startServerFor, hasServerFor } from './server-loader'
import defaultCapabs from './capabilities'
import { Server } from '@veonim/jsonrpc'
import { delay, proxyFn } from '../utils'

type ProxyFn = { [index: string]: Function }
type QueryableObject = { [index: string]: any }

interface Result {
  capabilities: QueryableObject
}

interface ActiveServer extends Server {
  canDo: Result & QueryableObject
}

export enum SyncKind { None, Full, Incremental }

const derp = (e: any) => console.error(e)
const servers = new Map<string, ActiveServer>()
const startingServers = new Set<string>()
const serverStartCallbacks = new Set<Function>()

const runningServers = {
  get: (cwd: string, type: string) => servers.get(`${cwd}::${type}`),
  add: (cwd: string, type: string, server: ActiveServer) => servers.set(`${cwd}::${type}`, server),
}

interface RequestHandler {
  method: string,
  cb: (arg: any) => any,
}

const serverRequestHandlers: RequestHandler[] = []

const startServer = async (cwd: string, filetype: string): Promise<ActiveServer> => {
  startingServers.add(cwd + filetype)
  const server = await startServerFor(filetype)
  await delay(3e3)
  const { error, capabilities: canDo } = await server.request.initialize(defaultCapabs(cwd)).catch(derp)
  if (error) throw `failed to initalize server ${filetype} -> ${JSON.stringify(error)}`
  server.notify.initialized()
  runningServers.add(cwd, filetype, { ...server, canDo })
  startingServers.delete(cwd + filetype)
  serverStartCallbacks.forEach(fn => fn(cwd, filetype))
  return { ...server, canDo }
}

const registerDynamicCaller = (namespace: string): ProxyFn => proxyFn(async (method, params) => {
  const { cwd, filetype } = params
  if (!hasServerFor(filetype) || startingServers.has(cwd + filetype)) return

  const server = runningServers.get(cwd, filetype) || await startServer(cwd, filetype)
  if (!server) return derp(`could not load server type:${filetype} cwd:${cwd}`)

  // TODO: cleanup
  console.log(`LS --> ${method} ${JSON.stringify(params)}`)
  const result = await server.request[`${namespace}/${method}`](params).catch(derp)
  // TODO: cleanup
  console.log(`LS <-- ${JSON.stringify(result)}`)
  return result
})

export const client = registerDynamicCaller('client')
export const workspace = registerDynamicCaller('workspace')
export const completionItem = registerDynamicCaller('completionItem')
export const codeLens = registerDynamicCaller('codeLens')
export const documentLink = registerDynamicCaller('documentLink')
export const window = registerDynamicCaller('window')
export const textDocument = registerDynamicCaller('textDocument')
export const telemetry = registerDynamicCaller('telemetry')

export const onServerStart = (fn: (cwd: string, filetype: string) => void) => {
  serverStartCallbacks.add(fn)
  return () => serverStartCallbacks.delete(fn)
}

export const cancelRequest = (cwd: string, filetype: string, id: string | number) => {
  const m = registerDynamicCaller('$')
  m.cancelRequest({ cwd, language: filetype, id })
}

export const onServerRequest = <ArgType, ReturnType>(method: string, cb: (arg: ArgType) => Promise<ReturnType>) => serverRequestHandlers.push({ method, cb })

export const getSyncKind = (cwd: string, filetype: string): SyncKind => {
  const server = runningServers.get(cwd, filetype)
  if (!server) return SyncKind.Full
  return (server.canDo.textDocumentSync || {}).change || SyncKind.Full
}

onServerStart((cwd, filetype) => serverRequestHandlers.forEach(({ method, cb }) => {
  const server = runningServers.get(cwd, filetype)
  if (!server) throw `was told server ${cwd}:${filetype} was started, but it was not found under 'runningServers'`
  server.on(method, cb)
}))
