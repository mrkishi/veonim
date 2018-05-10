import { downloadGithubExt, downloadVscodeExt } from '../support/download'
import { load as loadExtensions } from '../core/extensions'
import { remove as removePath, ensureDir } from 'fs-extra'
import { NotifyKind, notify } from '../ui/notifications'
import { exists, getDirs, is } from '../support/utils'
import { EXT_PATH } from '../config/default-configs'
import { join } from 'path'

interface Extension {
  name: string,
  user: string,
  repo: string,
  installed: boolean,
}

enum ExtensionKind {
  Github,
  VSCode,
}

const parseGithubExt = (text: string) => {
  const [ , user = '', repo = '' ] = (text.match(/^([^/]+)\/(.*)/) || [])
  return { user, repo }
}

const parseVscodeExt = (text: string) => {
  const [ , user = '', repo = '' ] = (text.match(/^([^\.]+)\.(.*)/) || [])
  return { user, repo }
}

const parseExtensionDefinition = (text: string) => {
  if (text.toLowerCase().startsWith('vscode:extension/')) return {
    kind: ExtensionKind.VSCode,
    ...parseVscodeExt(text.toLowerCase().replace('vscode:extension/', '')),
  }

  else return {
    kind: ExtensionKind.Github,
    ...parseGithubExt(text),
  }
}

const getExtensions = async (configLines: string[]) => Promise.all(configLines
  .filter(line => /^VeonimExt(\s*)/.test(line))
  .map(line => (line.match(/^VeonimExt(\s*)(?:"|')(\S+)(?:"|')/) || [])[2])
  .filter(is.string)
  .map(parseExtensionDefinition)
  .map(async m => {
    const name = `${m.user}--${m.repo}`

    return {
      ...m,
      name,
      installed: await exists(join(EXT_PATH, name)),
    }
  }))

const removeExtraneous = async (extensions: Extension[]) => {
  const dirs = await getDirs(EXT_PATH)
  const extensionInstalled = (path: string) => extensions.some(e => e.name === path)
  const toRemove = dirs.filter(d => !extensionInstalled(d.name))

  toRemove.forEach(dir => removePath(dir.path))
}

export default async (configLines: string[]) => {
  const extensions = await getExtensions(configLines).catch()
  const extensionsNotInstalled = extensions.filter(ext => !ext.installed)
  if (!extensionsNotInstalled.length) return removeExtraneous(extensions)

  notify(`Found ${extensionsNotInstalled.length} Veonim extensions. Installing...`, NotifyKind.System)
  await ensureDir(EXT_PATH)

  await Promise.all(extensions.map(ext => {
    const isVscodeExt = ext.kind === ExtensionKind.VSCode

    const config = {
      user: ext.user,
      repo: ext.repo,
      destination: EXT_PATH,
      dirname: `${ext.user}--${ext.repo}`,
    }

    isVscodeExt ? downloadVscodeExt(config) : downloadGithubExt(config)
  }))

  notify(`Installed ${extensionsNotInstalled.length} Veonim extensions!`, NotifyKind.Success)

  removeExtraneous(extensions)
  loadExtensions()
}
