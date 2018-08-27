import { basename } from 'path'

export interface ExtensionInfo {
  name: string
  publisher: string
}

export enum ActivationEventType {
  WorkspaceContains = 'workspaceContains',
  Language = 'onLanguage',
  Command = 'onCommand',
  Debug = 'onDebug',
  DebugInitialConfigs = 'onDebugInitialConfigurations',
  DebugResolve = 'onDebugResolve',
  View = 'onView',
  Always  = '*',
}

interface ActivationEvent {
  type: ActivationEventType
  value: string
}

export interface Disposable {
  dispose: () => any
  [index: string]: any
}

export interface Extension extends ExtensionInfo {
  config: any
  packagePath: string
  requirePath: string
  extensionDependencies: string[]
  activationEvents: ActivationEvent[]
  subscriptions: Set<Disposable>
}

export const activateExtension = async (e: Extension): Promise<Disposable[]> => {
  const requirePath = e.requirePath
  const extName = basename(requirePath)

  const extension = require(requirePath)
  if (!extension.activate) {
    console.error(`extension ${extName} does not have a .activate() method`)
    return [] as any[]
  }

  const context = { subscriptions: [] as any[] }
  await extension.activate(context).catch((err: any) => console.error(extName, err))

  context.subscriptions.forEach(sub => e.subscriptions.add(sub))

  return context.subscriptions
}
