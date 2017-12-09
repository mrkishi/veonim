import { transform, remapModifier, registerShortcut } from '../core/input'
import * as windows from '../components/windows'
import { is, fromJSON } from '../support/utils'
import { action, call } from '../core/neovim'
import { remote } from 'electron'
import { Script } from 'vm'

// TODO: deprecate remapModifier and use transform instead?
action('remap-modifier', (from, to) => remapModifier(from, to))
action('register-shortcut', key => registerShortcut(key, () => call.VeonimCallEvent(`key:${key}`)))

action('key-transform', (type, matcher, transformer) => {
  const fn = Reflect.get(transform, type)
  const transformFn = new Script(transformer).runInThisContext()
  const matchObj = is.string(matcher) ? fromJSON(matcher).or({}) : matcher

  if (is.function(fn) && is.function(transformFn)) fn(matchObj, transformFn)
})

action('quit', () => remote.app.quit())
action('devtools', () => remote.getCurrentWebContents().toggleDevTools())
action('fullscreen', () => {
  const win = remote.getCurrentWindow()
  win.setFullScreen(!win.isFullScreen())
})

action('blarg', () => windows.render())
