import WorkerClient from '../messaging/worker-client'
import fakeModule from '../support/fake-module'

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

on.lol((wut: string) => {
  console.log('lolwut:', wut)
})
