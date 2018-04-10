import { configPath, readFile, exists } from '../support/utils'
import installExtensions from '../support/manage-extensions'
import installPlugins from '../support/manage-plugins'
import { watchConfig } from '../config/config-reader'
import { join } from 'path'

const vimrcPath = join(configPath, 'nvim/init.vim')

const getVimrcLines = async () => (await readFile(vimrcPath))
  .toString()
  .split('\n')

const refreshDependencies = async () => {
  const vimrcExists = await exists(vimrcPath)
  if (!vimrcExists) return

  const configLines = await getVimrcLines()
  installExtensions(configLines)
  installPlugins(configLines)
}

export default () => {
  refreshDependencies()
  watchConfig('nvim/init.vim', refreshDependencies)
}
