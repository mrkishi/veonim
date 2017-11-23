import * as extensions from '../extensions'
import defaultCapabs from './capabilities'
import * as dispatch from '../dispatch'
import { Server } from '../jsonrpc'
import { proxyFn } from '../utils'

type ProxyFn = { [index: string]: Function }
type QueryableObject = { [index: string]: any }

interface Result {
  capabilities: QueryableObject
}

interface ActiveServer extends Server {
  canDo: Result & QueryableObject
}

interface RequestHandler {
  method: string,
  cb: (arg: any) => any,
}

export enum SyncKind { None, Full, Incremental }

const derp = (e: any) => console.error(e)
const servers = new Map<string, ActiveServer>()
const startingServers = new Set<string>()
const serverStartCallbacks = new Set<Function>()
const serverRequestHandlers: RequestHandler[] = []

const runningServers = {
  has: (cwd: string, type: string) => servers.has(`${cwd}::${type}`),
  get: (cwd: string, type: string) => servers.get(`${cwd}::${type}`),
  add: (cwd: string, type: string, server: ActiveServer) => servers.set(`${cwd}::${type}`, server),
}

const initServer = async (server: Server, cwd: string, filetype: string) => {
  const { error, capabilities: canDo } = await server.request.initialize(defaultCapabs(cwd)).catch(derp)
  if (error) {
    dispatch.pub('langserv:start.fail', filetype, error)
    throw `failed to initalize server ${filetype} -> ${JSON.stringify(error)}`
  }
  server.notify.initialized()

  runningServers.add(cwd, filetype, { ...server, canDo })
  serverStartCallbacks.forEach(fn => fn(cwd, filetype))

  dispatch.pub('langserv:start.success', filetype)
}

const serverSend = async (server: Server, namespace: string, method: string, params: any[], notify: boolean) => notify
  ? server.notify[`${namespace}/${method}`](params)
  : server.request[`${namespace}/${method}`](params)

const startingServer = (cwd: string, filetype: string) => {
  startingServers.add(cwd + filetype)
  return { done: () => startingServers.delete(cwd + filetype)}
}

const registerDynamicCaller = (namespace: string, { notify = false } = {}): ProxyFn => proxyFn(async (method, params) => {
  const { cwd, filetype } = params
  if (startingServers.has(cwd + filetype)) return

  if (runningServers.has(cwd, filetype)) {
    const server = runningServers.get(cwd, filetype)
    if (!server) {
      dispatch.pub('langserv:error.load', filetype, cwd)
      return derp(`could not load server type:${filetype} cwd:${cwd}`)
    }
    return serverSend(server, namespace, method, params, notify)
  }

  const starting = startingServer(cwd, filetype)
  const { status, reason, server } = await extensions.activate.language(filetype)

  // TODO: report status in GUI
  if (status === extensions.ActivationResultKind.NotExist) {
    starting.done()
    return
  }

  if (status === extensions.ActivationResultKind.Fail || !server) {
    dispatch.pub('langserv:start.fail', filetype, reason)
    derp(reason)
    starting.done()
    return
  }

  server.onError(e => dispatch.pub('langserv:error', filetype, e))
  server.onExit(c => dispatch.pub('langserv:exit', filetype, c))

  await initServer(server, cwd, filetype).catch(derp)
  starting.done()
  return serverSend(server, namespace, method, params, notify)
})

export const client = registerDynamicCaller('client')
export const workspace = registerDynamicCaller('workspace')
export const completionItem = registerDynamicCaller('completionItem')
export const codeLens = registerDynamicCaller('codeLens')
export const documentLink = registerDynamicCaller('documentLink')
export const window = registerDynamicCaller('window')
export const textDocument = registerDynamicCaller('textDocument')
export const telemetry = registerDynamicCaller('telemetry')

export const notify = {
  textDocument: registerDynamicCaller('textDocument', { notify: true }),
  workspace: registerDynamicCaller('workspace', { notify: true }),
}

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

const getTriggerChars = (cwd: string, filetype: string, kind: string): string[] => {
  const server = runningServers.get(cwd, filetype)
  if (!server) return []
  return (server.canDo[kind] || {}).triggerCharacters || []
}

export const triggers = {
  completion: (cwd: string, filetype: string): string[] => getTriggerChars(cwd, filetype, 'completionProvider'),
  signatureHelp: (cwd: string, filetype: string): string[] => getTriggerChars(cwd, filetype, 'signatureHelpProvider'),
}

// TODO: also reload extensions on vimrc change? i mean, if an extension definition was added or removed...
// otherwise it would be annoying to restart everything just because a mapping was changed
extensions.load()

onServerStart((cwd, filetype) => serverRequestHandlers.forEach(({ method, cb }) => {
  const server = runningServers.get(cwd, filetype)
  if (!server) throw `was told server ${cwd}:${filetype} was started, but it was not found under 'runningServers'`
  server.on(method, cb)
}))
