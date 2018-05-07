import { Extension, ActivationEvent, ActivationEventType,
  LanguageActivationResult, ActivationResultKind } from '../interfaces/extension'
import { merge, getDirFiles, readFile, fromJSON } from '../support/utils'
import WorkerClient from '../messaging/worker-client'
import { EXT_PATH } from '../config/default-configs'
import fakeModule from '../support/fake-module'
import { connect } from '../messaging/jsonrpc'
import { basename } from 'path'

type LogMissingModuleApi = (moduleName: string, apiPath: string) => void
let logMissingModuleApiDuringDevelopment: LogMissingModuleApi = () => {}

if (process.env.VEONIM_DEV) {
  logMissingModuleApiDuringDevelopment = (moduleName, apiPath) => console.warn(`fake module ${moduleName} is missing a value for: ${apiPath}`)
}

const LanguageClient = class LanguageClient {
  constructor (name: string, serverOpts: any, clientOpts: any) {
    console.log('start extension', name)
    console.log('with server options:', serverOpts)
    console.log('and client options:', clientOpts)
  }

  start () {
    console.log('TODO: start extension lang client RIGHT NOW LOL')
  }
}

fakeModule('vscode', {}, logMissingModuleApiDuringDevelopment)
fakeModule('vscode-languageclient', {
  LanguageClient,
}, logMissingModuleApiDuringDevelopment)

const { on } = WorkerClient()

interface ActivateOpts {
  kind: string,
  data: string,
}

on.activate(({ kind, data }: ActivateOpts) => {
  console.log('activatationEvent:', kind, 'for', data)

  if (kind === 'language') activate.language(kind)
})

on.load(() => load())

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

const load = async () => {
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

const activate = {
  language: async (language: string): Promise<LanguageActivationResult> => {
    const modulePath = languageExtensions.get(language)
    if (!modulePath) return { status: ActivationResultKind.NotExist }

    const extension = require(modulePath)

    if (!extension.activate) return {
      status: ActivationResultKind.Fail,
      reason: `extension ${basename(modulePath)} does not have a .activate() method`
    }

    const result: LanguageActivationResult = { status: ActivationResultKind.Success }

    result.server = await extension
      .activate({ connectLanguageServer: connect })
      .catch((reason: any) => merge(result, { reason, status: ActivationResultKind.Fail }))

    return result
  }
}
