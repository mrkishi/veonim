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
