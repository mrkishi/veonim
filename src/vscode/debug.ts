import { DebugConfigurationProvider, registerDebugConfigProvider } from '../extensions/debuggers'

const debug = {
  registerDebugConfigurationProvider: (debugType: string, provider: DebugConfigurationProvider) => {
    registerDebugConfigProvider(debugType, provider)
    return () => console.warn('NYI: dispoosesssese the debug provider pls kthx!')
  },
}

export default debug
