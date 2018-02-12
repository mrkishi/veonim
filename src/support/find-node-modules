// this is a simple implementation. there is much to improve

import { exists, readFile, fromJSON } from '../support/utils'
import { onStateChange } from '../core/neovim'
const watch = require('node-watch')
import { join } from 'path'

const packages = new Set<string>()
let watcher: any

const refreshPackages = async (path: string) => {
  const packageJsonExists = await exists(path)
  if (!packageJsonExists) return

  const data = await readFile(path)
  const { dependencies } = fromJSON(data + '').or({})
  const nodeModules = Object.keys(dependencies || {})

  if (!nodeModules.length) return

  packages.clear()
  nodeModules.forEach(m => packages.add(m))
}

const watchPackageJson = async (cwd: string) => {
  const packagePath = join(cwd, 'package.json')
  const packageJsonExists = await exists(packagePath)
  if (!packageJsonExists) return

  refreshPackages(packagePath)
  watcher.close()
  watcher = watch(packagePath, () => refreshPackages(packagePath))
}

onStateChange.cwd((cwd: string) => watchPackageJson(cwd))
