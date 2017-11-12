import { getDirFiles, configPath, readFile, fromJSON } from './utils'
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

interface ActivationEvent {
  type: ActivationEventType,
  value: string,
}

interface Extension {
  modulePath: string,
  activationEvents: ActivationEvent[],
}

const EXT_PATH = path.join(configPath, 'veonim', 'extensions')
const extensions = new Map<string, Extension>()
const languageExtensions = new Map<string, string>()
const languageServers = new Map<string, Server>()

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
  })))

  extensionData.forEach(m => {
    console.log('MODULE:', m.modulePath)
    console.log('activationEvents:', m.activationEvents)
  })

  extensions.clear()
  languageExtensions.clear()

  extensionData.forEach(m => {
    extensions.set(m.modulePath, m)
    m.activationEvents
      .filter(a => a.type === ActivationEventType.Language)
      .forEach(a => languageExtensions.set(a.value, m.modulePath))
  })

  console.log(extensions)
  console.log(languageExtensions)
}

export const activate = {
  language: async (language: string, workspace: string) => {
    const modulePath = languageExtensions.get(language)
    if (!modulePath) return {
      activated: false,
      reason: `no extension found for language ${language}`
    }

    const ext = require(modulePath)
    if (!ext.activate) return {
      activated: false,
      reason: `extension ${path.basename(modulePath)} does not have a .activate() method`
    }

    const key = `${workspace}:${language}`

    const anyError = await ext.activate({
      subscriptions: {
        push: (server: Server) => languageServers.set(key, server)
      }
    }, { connect }).catch((err: any) => err)

    return { activated: !anyError, reason: anyError, server: languageServers.get(key) }
  }
}
