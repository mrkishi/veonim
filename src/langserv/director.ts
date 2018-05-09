import { Diagnostic, WorkspaceEdit } from 'vscode-languageserver-types'
import defaultCapabs from '../langserv/capabilities'
import { proxyFn, Watchers } from '../support/utils'
import * as dispatch from '../messaging/dispatch'
import * as extensions from '../core/extensions'
import { applyEdit } from '../langserv/adapter'

type ProxyFn = { [index: string]: Function }
type QueryableObject = { [index: string]: any }

interface Result {
  capabilities: QueryableObject
}

interface ActiveServer extends extensions.LanguageServer {
  canDo: Result & QueryableObject
}

export enum SyncKind { None, Full, Incremental }

// const derp = (e: any) => console.error(e)
const servers = new Map<string, ActiveServer>()
const startingServers = new Set<string>()
const serverStartCallbacks = new Set<Function>()
const watchers = new Watchers()

// const runningServers = {
//   has: (cwd: string, type: string) => servers.has(`${cwd}::${type}`),
//   get: (cwd: string, type: string) => servers.get(`${cwd}::${type}`),
//   add: (cwd: string, type: string, server: ActiveServer) => servers.set(`${cwd}::${type}`, server),
// }

const initServer = async (server: Server, cwd: string, filetype: string) => {
  const { error, capabilities: canDo } = await server.request.initialize(defaultCapabs(cwd)).catch(console.error)

  if (error) throw new Error(`failed to initialize server ${filetype} -> ${JSON.stringify(error)}`)
  server.notify.initialized()

  servers.set(cwd + filetype, { ...server, canDo })
  serverStartCallbacks.forEach(fn => fn(server))

  dispatch.pub('langserv:start.success', filetype)
}

const serverSend = async (server: Server, namespace: string, method: string, params: any[], notify: boolean) => notify
  ? server.notify[`${namespace}/${method}`](params)
  : server.request[`${namespace}/${method}`](params)

const startingServer = (cwd: string, filetype: string) => {
  startingServers.add(cwd + filetype)
  return { done: () => startingServers.delete(cwd + filetype)}
}

const getServerForProjectAndLanguage = async (cwd: string, filetype: string) => {
  const id = cwd + filetype
  if (servers.has(id)) return servers.get(id)

  const serverAvailable = await extensions.existsForLanguage(filetype)
  if (!serverAvailable) return

  startingServers.add(id)
  const server = await extensions.activate.language(filetype)
  await initServer(server, cwd, filetype)
  startingServers.delete(id)
  // TODO: update statusline
  dispatch.pub('ai:start', filetype)

  return server
}

// TODO: can we make this composable? curried? just need to figure out typings
export const request = async (method: string, params: any) => {
  const { cwd, filetype } = params
  // TODO: should we buffer calls or just drop?
  if (startingServers.has(cwd + filetype)) return
  const server = await getServerForProjectAndLanguage(cwd, filetype)
  if (server) return server.sendRequest(method, params)
}

export const notify = async (method: string, params: any) => {
  const { cwd, filetype } = params
  // TODO: should we buffer calls or just drop?
  if (startingServers.has(cwd + filetype)) return
  const server = await getServerForProjectAndLanguage(cwd, filetype)
  if (server) server.sendNotification(method, params)
}

const registerDynamicCaller = (namespace: string, { notify = false } = {}): ProxyFn => proxyFn(async (method, params) => {
  const { cwd, filetype } = params
  if (startingServers.has(cwd + filetype)) return

  return runningServers.get(cwd, filetype)

  if (runningServers.has(cwd, filetype)) {
    const server = runningServers.get(cwd, filetype)
    if (!server) {
      dispatch.pub('langserv:error.load', filetype, cwd)
      return derp(`could not load server type:${filetype} cwd:${cwd}`)
    }

    return serverSend(server, namespace, method, params, notify)
  }

  const starting = startingServer(cwd, filetype)
  const server = await extensions.activate.language(filetype)

  if (!server) {
    starting.done()
    return
  }

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

export const onServerStart = (fn: (server: Server) => void) => {
  serverStartCallbacks.add(fn)
  return () => serverStartCallbacks.delete(fn)
}

export const cancelRequest = (cwd: string, filetype: string, id: string | number) => {
  const m = registerDynamicCaller('$')
  m.cancelRequest({ cwd, language: filetype, id })
}

export const onDiagnostics = (cb: (diagnostics: { uri: string, diagnostics: Diagnostic[] }) => void) => watchers.add('diagnostics', cb)

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

export const canCall = (cwd: string, filetype: string, capability: string) => {
  const server = runningServers.get(cwd, filetype)
  if (!server) return false
  const provider = `${capability}Provider`
  return !!server.canDo[provider]
}

export const triggers = {
  completion: (cwd: string, filetype: string): string[] => getTriggerChars(cwd, filetype, 'completionProvider'),
  signatureHelp: (cwd: string, filetype: string): string[] => getTriggerChars(cwd, filetype, 'signatureHelpProvider'),
}

// TODO: on vimrc change load any new or updated extensions. provide user with manual extensions reload
extensions.load()

onServerStart(server => {
  server.on('textDocument/publishDiagnostics', diag => watchers.notify('diagnostics', diag))
  server.onRequest('workspace/applyEdit', async ({ edit }: { edit: WorkspaceEdit }) => applyEdit(edit))
})
