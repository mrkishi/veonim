import { merge, getDirFiles, configPath, readFile, fromJSON } from './utils'
import { connect, Server } from '@veonim/jsonrpc'
import * as path from 'path'

enum ActivationEventType {
  WorkspaceContains = 'workspaceContains',
  Language = 'onLanguage',
  Command = 'onCommand',
  Debug = 'onDebug',
  View = 'onView',
  Always  = '*',
}

export enum ActivationResultKind {
  Success,
  Fail,
  NotExist,
}

interface ActivationEvent {
  type: ActivationEventType,
  value: string,
}

interface Extension {
  modulePath: string,
  activationEvents: ActivationEvent[],
}

interface LanguageActivationResult {
  status: ActivationResultKind,
  reason?: string,
  server?: Server,
}

const EXT_PATH = path.join(configPath, 'veonim', 'extensions')
const extensions = new Map<string, Extension>()
const languageExtensions = new Map<string, string>()

const findExtensions = async () => {
  const extensionDirs = (await getDirFiles(EXT_PATH)).filter(m => m.dir)
  const dirFiles = await Promise.all(extensionDirs.map(async m => ({
    dir: m.path,
    files: await getDirFiles(m.path),
  })))

  return dirFiles
    .filter(m => m.files.some(f => f.name.toLowerCase() === 'package.json'))
    .map(m => ({
      path: m.dir,
      package: (m.files.find(f => f.name.toLowerCase() === 'package.json') || { path: '' }).path
    }))
}

const getActivationEvents = async (packagePath: string): Promise<ActivationEvent[]> => {
  const { activationEvents = [] } = fromJSON(await readFile(packagePath) as string).or({})
  return activationEvents.map((m: string) => ({
    type: m.split(':')[0] as ActivationEventType,
    value: m.split(':')[1],
  }))
}

export const load = async () => {
  const extensionPaths = await findExtensions()
  const extensionData = await Promise.all(extensionPaths.map(async m => ({
    modulePath: m.path,
    activationEvents: await getActivationEvents(m.package),
  })))

  extensions.clear()
  languageExtensions.clear()

  extensionData.forEach(m => {
    extensions.set(m.modulePath, m)
    m.activationEvents
      .filter(a => a.type === ActivationEventType.Language)
      .forEach(a => languageExtensions.set(a.value, m.modulePath))
  })
}

export const activate = {
  language: async (language: string): Promise<LanguageActivationResult> => {
    const modulePath = languageExtensions.get(language)
    if (!modulePath) return { status: ActivationResultKind.NotExist }

    const extension = require(modulePath)

    if (!extension.activate) return {
      status: ActivationResultKind.Fail,
      reason: `extension ${path.basename(modulePath)} does not have a .activate() method`
    }

    const result: LanguageActivationResult = { status: ActivationResultKind.Success }

    result.server = await extension
      .activate({ connectLanguageServer: connect })
      .catch((reason: any) => merge(result, { reason, status: ActivationResultKind.Fail }))

    return result
  }
}
