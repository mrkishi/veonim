import nvim from '../vscode/neovim'
import { basename } from 'path'
import * as vsc from 'vscode'

console.warn('workspae nvim:', nvim)

const workspace: typeof vsc.workspace = {
  get rootPath() { return nvim.state.cwd },
  get workspaceFolders() { return [ nvim.state.cwd ] },
  get name() { return basename(nvim.state.cwd) },
  // TODO: NYI
  // TODO: how to make this sync?
  get textDocuments() {
    console.warn('NYI: vscode.workspace.textDocuments')
    return []
  },
  // TODO: events...
  // TODO: functions...
}

export default workspace
