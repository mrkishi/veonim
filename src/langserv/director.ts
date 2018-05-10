import { Diagnostic, WorkspaceEdit } from 'vscode-languageserver-types'
import defaultCapabs from '../langserv/capabilities'
import * as dispatch from '../messaging/dispatch'
import * as extensions from '../core/extensions'
import { applyEdit } from '../langserv/adapter'
import pleaseGet from '../support/please-get'
import { Watchers } from '../support/utils'

interface ServKey {
  cwd: string,
  filetype: string,
}

export enum SyncKind { None, Full, Incremental }

const servers = new Map<string, extensions.LanguageServer>()
const serverCapabilities = new Map<string, any>()
const serverStartCallbacks = new Set<Function>()
const startingServers = new Set<string>()
const watchers = new Watchers()

const initServer = async (server: extensions.LanguageServer, cwd: string, filetype: string) => {
  const { error, capabilities } = await server
    .sendRequest('initialize', defaultCapabs(cwd))
    .catch(console.error)

  if (error) throw new Error(`failed to initialize server ${cwd}:${filetype} -> ${JSON.stringify(error)}`)
  server.sendNotification('initialized')

  servers.set(cwd + filetype, server)
  serverCapabilities.set(cwd + filetype, capabilities)
  serverStartCallbacks.forEach(fn => fn(server))
}

const startServer = async (cwd: string, filetype: string) => {
  // yes, we check this status before calling this method, but it's async
  // so by the time we get here it will be wrong. there was an issue with
  // timing that was resolved by adding this check here.
  if (isServerStarting(cwd, filetype)) return
  startingServers.add(cwd + filetype)

  const server = await extensions.activate.language(filetype)
  await initServer(server, cwd, filetype)

  startingServers.delete(cwd + filetype)
  dispatch.pub('ai:start', { cwd, filetype })

  return server
}

// this line of checking starting servers means that any server calls made
// during the gap between server start and server ready are dropped. it seems
// weird/wrong, but after some thought i came to the conclusion that this
// behavior is acceptable.
//
// the reasoning is that from a users perspective, the outcome should be the
// same whether the server is not available or if it is starting. in each of
// these states the server is unavailable to respond to requests.
//
// so either the server will start quickly enough that very few or no requests
// will be "dropped" or the server will take such a long time to start, that
// buffering any requests will result in the UI being spammed with lots of
// outdated information likely at the wrong item (and a very poor UX)
const isServerStarting = (cwd: string, filetype: string) => startingServers.has(cwd + filetype)

const getServerForProjectAndLanguage = async ({ cwd, filetype }: ServKey) => {
  if (isServerStarting(cwd, filetype)) return
  if (servers.has(cwd + filetype)) return servers.get(cwd + filetype)

  const serverAvailable = await extensions.existsForLanguage(filetype)
  if (!serverAvailable) return

  return startServer(cwd, filetype)
}

export const request = async (method: string, params: any) => {
  const server = await getServerForProjectAndLanguage(params)
  if (server) return server.sendRequest(method, params)
}

export const notify = async (method: string, params: any) => {
  const server = await getServerForProjectAndLanguage(params)
  if (server) server.sendNotification(method, params)
}

export const onServerStart = (fn: (server: extensions.LanguageServer) => void) => {
  serverStartCallbacks.add(fn)
  return () => serverStartCallbacks.delete(fn)
}

export const onDiagnostics = (cb: (diagnostics: { uri: string, diagnostics: Diagnostic[] }) => void) => watchers.add('diagnostics', cb)

export const getSyncKind = (cwd: string, filetype: string): SyncKind => {
  const capabilities = serverCapabilities.get(cwd + filetype)
  if (!capabilities) return SyncKind.Full
  return pleaseGet(capabilities).textDocumentSync.change(SyncKind.Full)
}

const getTriggerChars = (cwd: string, filetype: string, kind: string): string[] => {
  const capabilities = serverCapabilities.get(cwd + filetype)
  if (!capabilities) return []
  return pleaseGet(capabilities)[kind].triggerCharacters()
}

export const canCall = (cwd: string, filetype: string, capability: string): boolean => {
  const capabilities = serverCapabilities.get(cwd + filetype)
  if (!capabilities) return false
  return pleaseGet(capabilities)[`${capability}Provider`](false)
}

export const triggers = {
  completion: (cwd: string, filetype: string): string[] => getTriggerChars(cwd, filetype, 'completionProvider'),
  signatureHelp: (cwd: string, filetype: string): string[] => getTriggerChars(cwd, filetype, 'signatureHelpProvider'),
}

// TODO: on vimrc change load any new or updated extensions. provide user with manual extensions reload
extensions.load()

onServerStart(server => {
  server.onNotification(
    'textDocument/publishDiagnostics',
    diagnostics => watchers.notify('diagnostics', diagnostics),
  )
  server.onRequest(
    'workspace/applyEdit',
    async ({ edit }: { edit: WorkspaceEdit }) => applyEdit(edit),
  )
})
