import * as vsc from 'vscode'
import { hostname } from 'os'

const env: typeof vsc.env = {
  appName: 'Veonim',
  appRoot: process.cwd(),
  language: 'en-US',
  machineId: hostname(),
  sessionId: `Veonim-${Date.now()}`,
}

export default env
