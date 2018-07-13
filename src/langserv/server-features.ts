import { ServerCapabilities, TextDocumentSyncKind } from 'vscode-languageserver-protocol'
import toVSCodeLanguage from '../langserv/vsc-languages'
import { onFnCall, is } from '../support/utils'
import pleaseGet from '../support/please-get'

type EnableCheckFn = (cwd: string, filetype: string) => boolean

export interface ServerFeatures {
  completion: EnableCheckFn
  completionResolve: EnableCheckFn
  implementation: EnableCheckFn
  definition: EnableCheckFn
  typeDefinition: EnableCheckFn
  hover: EnableCheckFn
  signatureHint: EnableCheckFn
  highlights: EnableCheckFn
  references: EnableCheckFn
  rename: EnableCheckFn
  symbols: EnableCheckFn
  workspaceSymbols: EnableCheckFn
  codeActions: EnableCheckFn
  codeLens: EnableCheckFn
  codeLensResolve: EnableCheckFn
  color: EnableCheckFn
  executeCommand: EnableCheckFn
}

interface ServerTriggerChars {
  completion: Set<string>
  signatureHint: Set<string>
}

type Feature = keyof ServerFeatures

const serverFeatures = new Map<string, Map<Feature, boolean>>()
const serverTriggerChars = new Map<string, ServerTriggerChars>()
const serverSyncKind = new Map<string, TextDocumentSyncKind>()

const capabilitiesToFeatures = (c: ServerCapabilities) => {
  const m = new Map<Feature, boolean>()

  m.set('completion', !!c.completionProvider)
  m.set('completionResolve', !!pleaseGet(c).completionProvider.resolveProvider)
  m.set('implementation', !!c.implementationProvider)
  m.set('definition', !!c.definitionProvider)
  m.set('typeDefinition', !!c.typeDefinitionProvider)
  m.set('hover', !!c.hoverProvider)
  m.set('signatureHint', !!c.signatureHelpProvider)
  m.set('highlights', !!c.documentHighlightProvider)
  m.set('references', !!c.referencesProvider)
  m.set('rename', !!c.renameProvider)
  m.set('symbols', !!c.documentSymbolProvider)
  m.set('workspaceSymbols', !!c.workspaceSymbolProvider)
  m.set('codeActions', !!c.codeActionProvider)
  m.set('codeLens', !!c.codeLensProvider)
  m.set('codeLensResolve', !!pleaseGet(c).codeLensProvider.resolveProvider)
  m.set('color', !!c.colorProvider)
  m.set('executeCommand', !!c.executeCommandProvider)

  return m
}

const capabilitiesToTriggerChars = (c: ServerCapabilities) => ({
  completion: new Set(pleaseGet(c).completionProvider.triggerCharacters() as string),
  signatureHint: new Set(pleaseGet(c).signatureHelpProvider.triggerCharacters() as string),
})

const capabilitiesToSyncKind = (c: ServerCapabilities): TextDocumentSyncKind => {
  const syncKind = pleaseGet(c).textDocumentSync()
  if (syncKind == null) return TextDocumentSyncKind.None
  if (is.number(syncKind)) return syncKind
  return pleaseGet(c).textDocumentSync.change(TextDocumentSyncKind.None)
}

export const registerServer = (cwd: string, language: string, capabilities: ServerCapabilities) => {
  serverFeatures.set(cwd + language, capabilitiesToFeatures(capabilities))
  serverTriggerChars.set(cwd + language, capabilitiesToTriggerChars(capabilities))
  serverSyncKind.set(cwd + language, capabilitiesToSyncKind(capabilities))
}

export const unregisterServer = (cwd: string, language: string) => {
  serverFeatures.delete(cwd + language)
}

const featureEnabled = (cwd: string, filetype: string, feature: Feature): boolean => {
  const language = toVSCodeLanguage(filetype)
  const server = serverFeatures.get(cwd + language)
  if (!server) return false
  return !!server.get(feature)
}

export const supports = <ServerFeatures>onFnCall((name, [ cwd, filetype ]: any[]) => {
  return featureEnabled(cwd, filetype, name as Feature)
})

export const getTriggerChars = {
  completion: (cwd: string, filetype: string): Set<string> => {
    const language = toVSCodeLanguage(filetype)
    const server = serverTriggerChars.get(cwd + language)
    return server ? server.completion : new Set()
  },
  signatureHint: (cwd: string, filetype: string): Set<string> => {
    const language = toVSCodeLanguage(filetype)
    const server = serverTriggerChars.get(cwd + language)
    return server ? server.signatureHint : new Set()
  },
}

export const getSyncKind = (cwd: string, filetype: string): TextDocumentSyncKind => {
  const language = toVSCodeLanguage(filetype)
  return serverSyncKind.get(cwd + language) || TextDocumentSyncKind.None
}
