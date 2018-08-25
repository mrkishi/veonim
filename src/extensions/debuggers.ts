// TODO: worried about what happens if we import the worker module again...?
import { Extension, ActivationEventType, activateExtension } from '../workers/extension-host'
import pleaseGet from '../support/please-get'

export interface DebugConfiguration {
  name: string
  request: string
  type: string
}

export interface DebugConfigurationProvider {
  // TODO: better param types here pls
  provideDebugConfigurations: (folder: string, token?: any) => DebugConfiguration[]
  resolveDebugConfiguration: (folder: string, debugConfig: DebugConfiguration, token?: any) => DebugConfiguration
}

interface Debugger {
  type: string
  label: string
  program: string
  runtime?: 'node' | 'mono'
  initialConfigurations?: any[]
  hasInitialConfiguration: boolean
  hasConfigurationProvider: () => boolean
  extension: Extension
  debugConfigProviders: DebugConfigurationProvider[]
}

const debuggers = new Map<string, Debugger>()

const getExtensionDebuggers = (extension: Extension): Debugger[] => {
  const debuggers = pleaseGet(extension.config).contributes.debuggers([]) as any[]

  return debuggers.map(d => ({
    extension,
    type: d.type,
    label: d.label,
    program: d.program,
    runtime: d.runtime,
    initialConfigurations: d.initialConfigurations,
    debugConfigProviders: [],
    hasInitialConfiguration: !!d.initialConfigurations,
    hasConfigurationProvider: () => false,
  }))
}

export const collectDebuggersFromExtensions = (extensions: Extension[]): void => {
  // this function should only be called when we load extensions.  loading
  // extensions reloads ALL extensions whether they were loaded before or not.
  // this means we should reset the collection of debuggers from any previous
  // extension loadings
  debuggers.clear()

  extensions.forEach(ext => {
    const dbgs = getExtensionDebuggers(ext)
    dbgs.forEach(dbg => debuggers.set(dbg.type, dbg))
  })
}

export const getAvailableDebuggers = async (): Promise<Debugger[]> => {
  const hasNeededActivationEvent = ae => ae.type === ActivationEventType.Debug
    || ae.type === ActivationEventType.DebugInitialConfigs

  const activations = [...debuggers.values()]
    .filter(d => d.extension.activationEvents.some(hasNeededActivationEvent))
    .map(d => activateExtension(d.extension))

  // TODO: need to reach into the vscode api and get the debug provider funcs (and call them)
  // TODO: or return if it has static "initialConfigurations" datas (after
  // debug config provider. are they merged tho? if both exist?)

  const subs = await Promise.all(activations)
  return subs
}

export const getLaunchConfigs = async (): Promise<any> => {
  // TODO: get launch.json configs
}
