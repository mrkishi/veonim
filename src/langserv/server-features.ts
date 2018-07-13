import { ServerCapabilities } from 'vscode-languageserver-protocol'
import toVSCodeLanguage from '../langserv/vsc-languages'
import { onFnCall } from '../support/utils'

type EnableCheckFn = (cwd: string, filetype: string) => void

export interface ServerFeatures {
  completion: EnableCheckFn
  completionDetail: EnableCheckFn
  definition: EnableCheckFn
  hover: EnableCheckFn
  signatureHint: EnableCheckFn
  highlights: EnableCheckFn
  references: EnableCheckFn
  rename: EnableCheckFn
  symbols: EnableCheckFn
  workspaceSymbols: EnableCheckFn
  diagnostics: EnableCheckFn
}

type Feature = keyof ServerFeatures

const servers = new Map<string, Map<Feature, boolean>>()

const capabilitiesToFeatures = (capabilities: ServerCapabilities) => {
  // TODO: parse capabilities into Map
  return new Map()
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
