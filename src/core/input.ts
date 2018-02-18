import { action, call, current } from '../core/neovim'
import { is, fromJSON } from '../support/utils'
import { input } from '../core/master-control'
import { touched } from '../bootstrap/galaxy'
import { $ } from '../support/utils'
import { Script } from 'vm'

const modifiers = ['Alt', 'Shift', 'Meta', 'Control']
const remaps = new Map<string, string>()
let isCapturing = false
let holding = ''
let xformed = false
let lastDown = ''
let initialKeyPress = true

const isStandardAscii = (key: string) => key.charCodeAt(0) > 32 && key.charCodeAt(0) < 127
const handleMods = ({ ctrlKey, shiftKey, metaKey, altKey, key }: KeyboardEvent) => {
  const mods: string[] = []
  const onlyShift = shiftKey && !ctrlKey && !metaKey && !altKey
  const notCmdOrCtrl = !metaKey && !ctrlKey
  const macOSUnicode = process.platform === 'darwin' 
    && (altKey && notCmdOrCtrl)
    || (altKey && shiftKey && notCmdOrCtrl)

  if (onlyShift && isStandardAscii(key) && key.length === 1) return mods
  if (macOSUnicode) return mods
  if (ctrlKey) mods.push('C')
  if (shiftKey) mods.push('S')
  if (metaKey) mods.push('D')
  if (altKey) mods.push('A')
  return mods
}

const toVimKey = (key: string): string => {
  if (key === 'Backspace') return 'BS'
  if (key === '<') return 'LT'
  if (key === 'Escape') return 'Esc'
  if (key === 'Delete') return 'Del'
  if (key === ' ') return 'Space'
  if (key === 'ArrowUp') return 'Up'
  if (key === 'ArrowDown') return 'Down'
  if (key === 'ArrowLeft') return 'Left'
  if (key === 'ArrowRight') return 'Right'
  else return key
}

const isUpper = (char: string) => char.toLowerCase() !== char
const bypassEmptyMod = (key: string) => modifiers.includes(key) ? '' : key
const wrapKey = (key: string): string => key.length > 1 && isUpper(key[0]) ? `<${key}>` : key
const combineModsWithKey = (mods: string, key: string) => mods.length ? `${mods}-${key}` : key
const userModRemaps = (mods: string[]) => mods.map(m => remaps.get(m) || m)
const joinModsWithDash = (mods: string[]) => mods.join('-')
const mapMods = $(handleMods, userModRemaps, joinModsWithDash)
const mapKey = $(bypassEmptyMod, toVimKey)
const formatInput = $(combineModsWithKey, wrapKey)
const shortcuts = new Map<string, Function>()

export const registerShortcut = (keys: string, mode: string, cb: Function) =>
  shortcuts.set(`${mode}:<${keys.toUpperCase()}>`, cb)

// TODO: can we use transform to do the same thing as remapModifier? seems similar
export const remapModifier = (from: string, to: string) => remaps.set(from, to)
export const focus = () => {
  isCapturing = true
  xformed = false
  lastDown = ''
  holding = ''
}

export const blur = () => {
  isCapturing = false
  xformed = false
  lastDown = ''
  holding = ''
}

type Transformer = (input: KeyboardEvent) => KeyboardEvent
export const xfrmHold = new Map<string, Transformer>()
export const xfrmDown = new Map<string, Transformer>()
export const xfrmUp = new Map<string, Transformer>()

const keToStr = (e: KeyboardEvent) => [e.key, <any>e.ctrlKey|0, <any>e.metaKey|0, <any>e.altKey|0, <any>e.shiftKey|0].join('')

const defkey = {...new KeyboardEvent('keydown'), key: '', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false}

export const transform = {
  hold: (e: any, fn: Transformer) =>
    xfrmHold.set(keToStr({...defkey, ...e}), e => ({ ...e, ...fn(e) })),

  down: (e: any, fn: Transformer) =>
    xfrmDown.set(keToStr({...defkey, ...e}), e => ({ ...e, ...fn(e) })),

  up: (e: any, fn: Transformer) => {
    const before = keToStr({ ...defkey, ...e })
    const now = keToStr({ ...defkey, key: e.key })
    xfrmUp.set(before + now, e => ({ ...e, ...fn(e) }))
  }
}

const sendKeys = async (e: KeyboardEvent) => {
  if (initialKeyPress) (initialKeyPress = false, touched())

  const key = bypassEmptyMod(e.key)
  if (!key) return
  const inputKeys = formatInput(mapMods(e), mapKey(e.key))

  // TODO: this might need more attention
  if (inputKeys === '<S-Space>') return input('<space>')
  if (shortcuts.has(`${current.mode}:${inputKeys}`)) return shortcuts.get(`${current.mode}:${inputKeys}`)!()
  if (inputKeys.length > 1 && !inputKeys.startsWith('<')) inputKeys.split('').forEach((k: string) => input(k))
  else input(inputKeys)
}

window.addEventListener('keydown', e => {
  if (!isCapturing) return
  const es = keToStr(e)

  lastDown = es

  if (xfrmDown.has(es)) {
    const remapped = xfrmDown.get(holding)!(e)
    sendKeys(remapped)
    return
  }

  if (xfrmHold.has(es)) {
    holding = es
    return
  }

  if (xfrmHold.has(holding)) {
    const remapped = xfrmHold.get(holding)!(e)
    sendKeys(remapped)
    xformed = true
    return
  }

  sendKeys(e)
})

window.addEventListener('keyup', e => {
  if (!isCapturing) return
  const es = keToStr(e)

  const prevKeyAndThisOne = lastDown + es
  if (xfrmUp.has(prevKeyAndThisOne)) return sendKeys(xfrmUp.get(prevKeyAndThisOne)!(e))

  if (holding === es) {
    if (!xformed) sendKeys(e)
    xformed = false
    holding = ''
  }
})

// TODO: deprecate remapModifier and use transform instead?
action('remap-modifier', (from, to) => remapModifier(from, to))

action('register-shortcut', (key, mode) => registerShortcut(key, mode, () => call.VeonimCallEvent(`key:${mode}:${key}`)))

action('key-transform', (type, matcher, transformer) => {
  const fn = Reflect.get(transform, type)
  const transformFn = new Script(transformer).runInThisContext()
  const matchObj = is.string(matcher) ? fromJSON(matcher).or({}) : matcher

  if (is.function(fn) && is.function(transformFn)) fn(matchObj, transformFn)
})
