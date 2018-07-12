import toVSCodeLanguage from '../langserv/vsc-languages'
import { onFnCall } from '../support/utils'

export enum ServerFeature {
  Completion = 'completion',
  CompletionDetail = 'completionDetail',
  Definition = 'definition',
  Hover = 'hover',
  SignatureHint = 'signatureHint',
  Highlights = 'highlights',
  References = 'references',
  Rename = 'rename',
  Symbols = 'symbols',
  WorkspaceSymbols = 'workspaceSymbols',
  Diagnostics = 'diagnostics',
}

const servers = new Map<string, Map<ServerFeature, boolean>>()

const capabilitiesToFeatures = (capabilities: any) => {

}

export const registerServer = (cwd: string, language: string, capabilities: any) => {
  servers.set(cwd + language, capabilitiesToFeatures(capabilities))
}

export const unregisterServer = (cwd: string, language: string) => {
  servers.delete(cwd + language)
}

const featureEnabled = (cwd: string, filetype: string, feature: ServerFeature): boolean => {
  const language = toVSCodeLanguage(filetype)
  const serverFeatures = servers.get(cwd + language)
  if (!serverFeatures) return false
  return !!serverFeatures.get(feature)
}

type isEnabledProxy = { [index: keyof ServerFeature]: (cwd: string, filetype: string) => boolean }

export const isEnabled = <isEnabledProxy>onFnCall((feature: ServerFeature, ...args: any[]) => {
  const [ cwd, filetype ] = args
  return featureEnabled(cwd, filetype, feature)
})
