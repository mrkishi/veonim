import { downloadGithubExt, downloadVscodeExt } from '../support/download'
import { load as loadExtensions } from '../core/extensions'
import { NotifyKind, notify } from '../ui/notifications'
import { exists, getDirs, is } from '../support/utils'
import { EXT_PATH } from '../config/default-configs'
import { remove as removePath } from 'fs-extra'
import Worker from '../messaging/worker'
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

const url = {
  github: (user: string, repo: string) => `https://github.com/${user}/${repo}/archive/master.zip`,
  vscode: (author: string, name: string, version = 'latest') => `https://${author}.gallery.vsassets.io/_apis/public/gallery/publisher/${author}/extension/${name}/${version}/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage`,
}

const { request } = Worker('download')

const parseExtensionDefinition = (text: string) => {
  const isVscodeExt = text.toLowerCase().startsWith('vscode:extension')
  const [ , user = '', repo = '' ] = isVscodeExt
    ? (text.match(/^(?:vscode:extension\/)([^\.]+)\.(.*)/) || [])
    : (text.match(/^([^/]+)\/(.*)/) || [])

  return { user, repo, kind: isVscodeExt ? ExtensionKind.VSCode : ExtensionKind.Github }
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

  const installed = await Promise.all(extensions.map(ext => {
    const isVscodeExt = ext.kind === ExtensionKind.VSCode
    const destination = join(EXT_PATH, `${ext.user}--${ext.repo}`)
    const downloadUrl = isVscodeExt ? url.vscode(ext.user, ext.repo) : url.github(ext.user, ext.repo)

    return request.download(downloadUrl, destination)
  }))

  const installedOk = installed.filter(m => m).length
  const installedFail = installed.filter(m => !m).length

  if (installedOk) notify(`Installed ${installedOk} Veonim extensions!`, NotifyKind.Success)
  if (installedFail) notify(`Failed to install ${installedFail} Veonim extensions. See devtools console for more info.`, NotifyKind.Error)

  removeExtraneous(extensions)
  loadExtensions()
}
