import WorkerClient from '../messaging/worker-client'
console.log('loading debug-host web worker')
import '../support/vscode-shim'

// download extension for dev debug
// vscode:extension/ms-vscode.node-debug2
// https://ms-vscode.gallery.vsassets.io/_apis/public/gallery/publisher/ms-vscode/extension/node-debug2/latest/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage
//

const modulePath = '../memes/extension/out/src/extension'


const doTheNeedful = async () => {
  const ext = require(modulePath)
  if (!ext.activate) return console.log('this debug ext does not have an "activate" method lolwtf??')

  const context = { subscriptions: [] }
  // TODO: ext.activate may not necessarily be an async function. we should probably check this in
  // extensions toooooooo
  ext.activate(context)

  console.log('subs:', context.subscriptions)
}

doTheNeedful().catch(console.error)
