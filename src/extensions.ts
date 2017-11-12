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
  disposables: any[],
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
  const { activationEvents = [] } = fromJSON(await readFile(packagePath)).or({})
  return activationEvents.map((m: string) => ({
    type: m.split(':')[0] as ActivationEventType,
    value: m.split(':')[1],
  }))
}

// TODO: call on veonim startup and whenever vimrc changes
export const load = async () => {
  const extensionPaths = await findExtensions()
  const extensionData = await Promise.all(extensionPaths.map(async m => ({
    modulePath: m.path,
    activationEvents: await getActivationEvents(m.package),
    disposables: [],
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

    // TODO: needs rework you lazy fuck. THIS IS WIP FOR MVP
    // TODO: disposables does not necessarily mean a language server.
    // also there can be more than one lang server

    // need to figure out how vscode language client identifies a lang server in extension subscriptions

    const result: LanguageActivationResult = { status: ActivationResultKind.Success }

    await extension.activate({
      // TODO: give proxy access to disposables array or implement array like?
      subscriptions: {
        push: (server: Server) => (result.server = server, extensions.get(modulePath)!.disposables.push(server))
      }
    }, { connect }).catch((reason: any) => merge(result, { status: ActivationResultKind.Fail, reason }))

    return result
  }
}
