import { is, writeFile, fromJSON } from '../../utils'
import { transform, remapModifier } from '../input'
import { action } from '../neovim'
import { remote } from 'electron'
// TODO: typings PLSKTHXBAI
const tempy = require('tempy')

// because eval/node.vm is much slower and key input needs to be 2FAST 2FURIOUS
// TODO: module loader uses vm.inThisContext... can we just do that instead of write/read file?
const injectCode = async (code: string): Promise<any> => {
  const filedata = `module.exports = console.time('XF'); ${code}; console.timeEnd('XF')`
  const path = tempy.file({ extension: 'js' })
  await writeFile(path, filedata)
  return require(path)
}

// TODO: deprecate remapModifier and use transform instead?
action('remap-modifier', (from, to) => remapModifier(from, to))

action('key-transform', async (type, matcher, transformer) => {
  const fn = Reflect.get(transform, type)
  const transformFn = await injectCode(transformer)
  const matchObj = is.string(matcher) ? fromJSON(matcher) : matcher

  if (is.function(fn) && is.function(transformFn)) fn(matchObj, transformFn)
})

action('quit', () => remote.app.quit())
action('devtools', () => remote.getCurrentWebContents().toggleDevTools())
action('fullscreen', () => {
  const win = remote.getCurrentWindow()
  win.setFullScreen(!win.isFullScreen())
})
