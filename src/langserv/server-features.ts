import { ServerCapabilities } from 'vscode-languageserver-protocol'
import toVSCodeLanguage from '../langserv/vsc-languages'
import pleaseGet from '../support/please-get'
import { onFnCall } from '../support/utils'

type EnableCheckFn = (cwd: string, filetype: string) => void

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

type Feature = keyof ServerFeatures

const servers = new Map<string, Map<Feature, boolean>>()

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

export const registerServer = (cwd: string, language: string, capabilities: ServerCapabilities) => {
  servers.set(cwd + language, capabilitiesToFeatures(capabilities))
}

export const unregisterServer = (cwd: string, language: string) => {
  servers.delete(cwd + language)
}

const featureEnabled = (cwd: string, filetype: string, feature: Feature): boolean => {
  const language = toVSCodeLanguage(filetype)
  const serverFeatures = servers.get(cwd + language)
  if (!serverFeatures) return false
  return !!serverFeatures.get(feature)
}

export const serverSupports = <ServerFeatures>onFnCall((name, ...args: any[]) => {
  const [ cwd, filetype ] = args
  return featureEnabled(cwd, filetype, name as Feature)
})
