import { ActivationEvent, ActivationEventType, LanguageActivationResult, ActivationResultKind } from '../interfaces/extension'
import { merge, getDirFiles, readFile, fromJSON } from '../support/utils'
import WorkerClient from '../messaging/worker-client'
// import { EXT_PATH } from '../config/default-configs'
import fakeModule from '../support/fake-module'
import { connect } from '../messaging/jsonrpc'
import { basename, join } from 'path'

// TODO: TEMP ONLY
import { configPath } from '../support/utils'
const EXT_PATH = join(configPath, 'veonim', 'ext2')

interface Extension {
  requirePath: string,
  activationEvents: ActivationEvent[],
}

interface ExtensionLocation {
  packagePath: string,
  packageJson: string,
}

type LogMissingModuleApi = (moduleName: string, apiPath: string) => void
let logMissingModuleApiDuringDevelopment: LogMissingModuleApi = () => {}

if (process.env.VEONIM_DEV) {
  logMissingModuleApiDuringDevelopment = (moduleName, apiPath) => console.warn(`fake module ${moduleName} is missing an implementation for: ${apiPath}`)
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

  if (kind === 'language') activate.language(data)
})

on.load(() => load())

const extensions = new Map<string, Extension>()
const languageExtensions = new Map<string, string>()

const findExtensions = async (): Promise<ExtensionLocation[]> => {
  const extensionDirs = (await getDirFiles(EXT_PATH)).filter(m => m.dir)
  const dirFiles = await Promise.all(extensionDirs.map(async m => ({
    dir: m.path,
    files: await getDirFiles(m.path),
  })))

  return dirFiles
    .filter(m => m.files.some(f => f.name.toLowerCase() === 'package.json'))
    .map(m => ({
      packagePath: m.dir,
      packageJson: (m.files.find(f => f.name.toLowerCase() === 'package.json') || { path: '' }).path
    }))
}

const getPackageJsonConfig = async ({ packagePath, packageJson }: ExtensionLocation): Promise<Extension> => {
  const rawFileData = await readFile(packageJson)
  const { main, activationEvents = [] } = fromJSON(rawFileData).or({})

  const parsedActivationEvents = activationEvents.map((m: string) => ({
    type: m.split(':')[0] as ActivationEventType,
    value: m.split(':')[1],
  }))

  return {
    requirePath: join(packagePath, main),
    activationEvents: parsedActivationEvents,
  }
}

const load = async () => {
  const extensionPaths = await findExtensions()
  const extensionData = await Promise.all(extensionPaths.map(m => getPackageJsonConfig(m)))

  extensions.clear()
  languageExtensions.clear()

  console.log('extensions found:', extensionData)

  extensionData.forEach(m => {
    extensions.set(m.requirePath, m)
    m.activationEvents
      .filter(a => a.type === ActivationEventType.Language)
      .forEach(a => languageExtensions.set(a.value, m.requirePath))
  })
}

const context = {
  subscriptions: []
}

const activate = {
  language: async (language: string): Promise<LanguageActivationResult> => {
    console.log('pls activate:', language)
    const modulePath = languageExtensions.get(language)
    console.log(modulePath, languageExtensions)
    if (!modulePath) return { status: ActivationResultKind.NotExist }

    const extension = require(modulePath)

    if (!extension.activate) return {
      status: ActivationResultKind.Fail,
      reason: `extension ${basename(modulePath)} does not have a .activate() method`
    }

    const result: LanguageActivationResult = { status: ActivationResultKind.Success }

    await extension.activate(context).catch((reason: any) => merge(result, {
      reason,
      status: ActivationResultKind.Fail,
    }))

    console.log('activated extension:', modulePath)

    // TODO: do we need to pass 'ELECTRON_RUN_AS_NODE' in the spawn call?
    // i think vsc sets it globally for the entire electron process somehow?
    // result.server = ...?
    // result.server = await extension
    //   .activate({ connectLanguageServer: connect })
    //   .catch((reason: any) => merge(result, { reason, status: ActivationResultKind.Fail }))

    return result
  }
}
