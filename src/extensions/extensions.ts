import { Extension } from '../workers/extension-host'
import { basename } from 'path'

// TODO: move this to some more centralized place and share with other modules
interface Disposable {
  dispose: () => any
  [index: string]: any
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
