import { action, current } from '../core/neovim'
import { go } from '../state/trade-federation'
import { getDirFiles } from '../support/utils'
import config from '../config/config-service'
import { FileDir } from '../state/explorer'
import { join } from 'path'

const ignored: { dirs: string[], files: string[] } = {
  dirs: config('explorer.ignore.dirs', m => ignored.dirs = m),
  files: config('explorer.ignore.files', m => ignored.files = m),
}

const sortDirFiles = (filedirs: FileDir[]) => {
  const dirs = filedirs.filter(f => f.dir && !ignored.dirs.includes(f.name))
  const files = filedirs.filter(f => f.file && !ignored.files.includes(f.name))
  return [...dirs, ...files]
}

action('explorer2', async () => {
  const { cwd, file } = current
  const path = join(cwd, file)
  const paths = sortDirFiles(await getDirFiles(path))
  go.showExplorer({ cwd, path, paths })
})
