import { is, fromJSON } from '../../utils'
import { transform, remapModifier } from '../input'
import { action } from '../neovim'
import { remote } from 'electron'
import { Script } from 'vm'

const injectCode = async (code: string): Promise<any> => new Script(code).runInThisContext()

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
