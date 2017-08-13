import { input } from '../master-control'
import { $ } from '../utils'

const modifiers = ['Alt', 'Shift', 'Meta', 'Control']
const remaps = new Map<string, string>()
let isCapturing = false
let holding = ''
let xformed = false
let lastDown = ''

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

export const registerShortcut = (keys: string, cb: Function) => shortcuts.set(`<${keys.toUpperCase()}>`, cb)
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
const xfrmHold = new Map<string, Transformer>()
const xfrmUp = new Map<string, Transformer>()
const xfrmDown = new Map<string, Transformer>()

const keToStr = (e: KeyboardEvent) => [e.key, <any>e.ctrlKey|0, <any>e.metaKey|0, <any>e.altKey|0, <any>e.shiftKey|0].join('')

const defkey = {...new KeyboardEvent('keydown'), key: '', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false}

// TODO:
// -technically there are two kinds of remapping that a user would think of
// i want to remap key A -> key B
// i want to remap key A -> key B HOWEVER, when key A (holding) -> key C
// is there a case where you would want ONLY a keyup remap?
// aka. hold + up should be combined together
// hold: A -> A (default, optional) + A(hold) -> C
// holdfull: A -> B + A(hold) -> C
export const transform = {
  hold: (e: any, fn: Transformer) => xfrmHold.set(keToStr({...defkey, ...e}), fn),
  down: (e: any, fn: Transformer) => xfrmDown.set(keToStr({...defkey, ...e}), fn),
  // TODO: set the before condition?
  // up: (before: any, now: any, fn: Transformer) => xfrmUp.set(keToStr({...defkey, ...e}), fn),
  up: (e: any, fn: Transformer) => xfrmUp.set(keToStr({...defkey, ...e}), fn),
}

transform.hold({ key: ';' }, e => ({ ...e, key: ';' + e.key }))

const sendKeys = (e: KeyboardEvent) => {
  const key = bypassEmptyMod(e.key)
  if (!key) return
  const inputKeys = formatInput(mapMods(e), mapKey(e.key))
  if (shortcuts.has(inputKeys)) return shortcuts.get(inputKeys)!()
  if (inputKeys.length > 1 && !inputKeys.startsWith('<')) inputKeys.split('').forEach((k: string) => input(k))
  else input(inputKeys)
}

window.addEventListener('keydown', e => {
  e.preventDefault()
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
  e.preventDefault()
  if (!isCapturing) return
  const es = keToStr(e)

  // TODO: temp dirty hack
  if (lastDown === 'Meta0100' && keToStr(e) === 'Meta0000') return input(`<Esc>`)

  if (holding === es) {
    if (!xformed) sendKeys(e)
    xformed = false
    holding = ''
  }
})
