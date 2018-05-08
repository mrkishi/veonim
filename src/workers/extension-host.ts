import { ActivationEvent, ActivationEventType, LanguageActivationResult, ActivationResultKind } from '../interfaces/extension'
import { merge, getDirFiles, readFile, fromJSON, is } from '../support/utils'
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
  protected name: string
  protected serverActivator: Function

  constructor (name: string, serverActivator: Function) {
    this.name = name
    this.serverActivator = serverActivator
  }

  start () {
    console.log('starting extension:', this.name)
    return this.serverActivator()
  }

  error (data: string) {
    console.error(this.name, data)
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

  extensionData.forEach(m => {
    extensions.set(m.requirePath, m)
    m.activationEvents
      .filter(a => a.type === ActivationEventType.Language)
      .forEach(a => languageExtensions.set(a.value, m.requirePath))
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
    const context = { subscriptions: [] }

    await extension.activate(context).catch((reason: any) => merge(result, {
      reason,
      status: ActivationResultKind.Fail,
    }))

    if (result.status === ActivationResultKind.Fail) return result

    const [ serverActivator ] = context.subscriptions

    // TODO: we need to pass 'ELECTRON_RUN_AS_NODE' in the spawn call
    // set it globally somehow or hack spawn?

    if (!is.promise(serverActivator)) return {
      reason: `server activator function not valid or not a promise: ${language} - ${modulePath}`,
      status: ActivationResultKind.Fail,
    }

    const childProcess = await serverActivator

    return {
      server: connect.ipc(childProcess),
      status: ActivationResultKind.Success,
    }
  }
}
