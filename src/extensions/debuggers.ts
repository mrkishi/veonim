import { activateExtension } from '../extensions/extensions'
import { Extension } from '../workers/extension-host'
import pleaseGet from '../support/please-get'
import { merge } from '../support/utils'

interface DebugConfiguration {
  name: string
  request: string
  type: string
  [index: string]: any
}

export interface DebugConfigurationProvider {
  provideDebugConfigurations?: (folderURI: string, token?: any) => DebugConfiguration[]
  resolveDebugConfiguration?: (folderURI: string, debugConfig: DebugConfiguration, token?: any) => DebugConfiguration
}

interface Debugger {
  type: string
  label: string
  program: string
  runtime?: 'node' | 'mono'
  initialConfigurations?: any[]
  hasInitialConfiguration: boolean
  hasConfigurationProvider: boolean
  extension: Extension
  debugConfigProviders: Set<DebugConfigurationProvider>
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
    debugConfigProviders: new Set(),
    hasInitialConfiguration: !!d.initialConfigurations,
    hasConfigurationProvider: false,
  }))
}

const getProviders = (type: string) => {
  const dbg = debuggers.get(type)

  if (!dbg) {
    console.error(`could not get debug providers for ${type}`)
    return []
  }

  return [...dbg.debugConfigProviders.values()]
}

const activateDebuggersByEvent = async (eventType: string) => {
  const activations = [...debuggers.values()]
    .filter(d => d.extension.activationEvents.some(ae => ae.type === eventType))
    .map(d => activateExtension(d.extension))

  return Promise.all(activations)
}

const getInitialConfigurations = (dbg: Debugger): DebugConfiguration[] => {
  return []

}

const getDebuggerConfig = async (cwd: string, type: string) => {
  const dbg = debuggers.get(type)
  if (!dbg) return console.error(`the debugger ${type} does not exist. lolwat`)

  const initialConfigs = getInitialConfigurations(dbg)
  const initialConfig = initialConfigs
    .reduce((finalConfig, config) => merge(finalConfig, config), {} as DebugConfiguration)

  return resolveConfigurationByProviders(cwd, type, initialConfig)
}

export const getAvailableDebuggers = async (): Promise<Debugger[]> => {
  await activateDebuggersByEvent('onDebugInitialConfigurations')
  await activateDebuggersByEvent('onDebug')
  return [...debuggers.values()].filter(d => d.hasInitialConfiguration || d.hasConfigurationProvider)
}

export const getLaunchConfigs = async (): Promise<any> => {
  // TODO: get launch.json configs
}

/*
 * Resolve a debug configuration from either an inital config or no config.
 *
 * Gets called from either of the following scenarios (in the following order)
 *
 * - We have a configuration from launch.json and we need to resolve it further
 * - We have an initial configuration from "initialConfigurations" or "provideDebugConfigurations"
 * - We have no configuration at all
 */
export const resolveConfigurationByProviders = async (cwd: string, type: string, config = {} as DebugConfiguration) => {
  await activateDebuggersByEvent(`onDebugResolve:${type}`)
  // not sure the significance of the * but that's how it is in the vsc source
  return [...getProviders(type), ...getProviders('*')]
    .filter(p => p.resolveDebugConfiguration)
    .reduce((q, provider) => q.then(config => config
      ? provider.resolveDebugConfiguration!(cwd, config)
      : Promise.resolve(config)
    ), Promise.resolve(config))
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

export const registerDebugConfigProvider = (type: string, provider: DebugConfigurationProvider) => {
  if (!provider) return

  const dbg = debuggers.get(type)
  if (!dbg) return console.error(`can't register debug config provider. debugger ${type} does not exist.`)

  dbg.debugConfigProviders.add(provider)
  // TODO: this is according to the vsc source. i wonder if we always get
  // provideDebugConfigurations and resolveDebugConfiguration together
  // or if its possible to only have one or the other. the interface
  // indicates that both must be present
  dbg.hasConfigurationProvider = !!provider.provideDebugConfigurations
}
