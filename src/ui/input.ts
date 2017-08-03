import { notify } from './neovim-client'
import { $ } from '../utils'

const { input } = notify
const modifiers = ['Alt', 'Shift', 'Meta', 'Control']
const remaps = new Map<string, string>()
let isCapturing = false
let down: string

const isStandardAscii = (key: string) => key.charCodeAt(0) > 32 && key.charCodeAt(0) < 127
const handleMods = ({ ctrlKey, shiftKey, metaKey, altKey, key }: KeyboardEvent) => {
  const mods: string[] = []
  const onlyShift = shiftKey && !ctrlKey && !metaKey && !altKey
  const notCmdOrCtrl = !metaKey && !ctrlKey
  const macOSUnicode = process.platform === 'darwin' 
    && (altKey && notCmdOrCtrl)
    || (altKey && shiftKey && notCmdOrCtrl)

  if (onlyShift && isStandardAscii(key)) return mods
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
  else return key
}

const bypassEmptyMod = (key: string) => modifiers.includes(key) ? '' : key
const wrapKey = (key: string): string => key.length > 1 && key[0].toUpperCase() === key[0] ? `<${key}>` : key
const combineModsWithKey = (mods: string, key: string) => mods.length ? `${mods}-${key}` : key
const userModRemaps = (mods: string[]) => mods.map(m => remaps.get(m) || m)
const joinModsWithDash = (mods: string[]) => mods.join('-')
const mapMods = $(handleMods, userModRemaps, joinModsWithDash)
const mapKey = $(bypassEmptyMod, toVimKey)
const formatInput = $(combineModsWithKey, wrapKey)
const shortcuts = new Map<string, Function>()

export const remapModifier = (from: string, to: string) => remaps.set(from, to)
export const focus = () => isCapturing = true
export const blur = () => isCapturing = false
export const registerShortcut = (keys: string, cb: Function) => shortcuts.set(`<${keys.toUpperCase()}>`, cb)

type Transformer = (input: KeyboardEvent) => KeyboardEvent
const xforms = new Map<string, Transformer>()

const keToStr = (e: KeyboardEvent) => [e.key, <any>e.ctrlKey|0, <any>e.metaKey|0, <any>e.altKey|0, <any>e.shiftKey|0].filter(a => a).join('')

export const addTransformer = (e: KeyboardEvent, fn: Transformer) => xforms.set(keToStr(e), fn)

const defkey = {...new KeyboardEvent('keydown'), key: '', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false}
addTransformer({...defkey, key: ';'}, e => ({...e, key: ';' + e.key}))
// TODO: add transform for alone (down + up => new key) aka ctrl/esc

console.log(xforms)

window.addEventListener('keydown', e => {
  if (!isCapturing) return
  const strKey = keToStr(e)

  console.log('strkey', strKey)
  console.log('down', down)
  if (xforms.has(down)) console.log(xforms.get(down)!(e))

  if (xforms.has(strKey) && down === strKey) return

  const ev = xforms.has(down) ? xforms.get(down)!(e) : e
  if (!xforms.has(down)) down = keToStr(e)

  const key = bypassEmptyMod(ev.key)
  if (!key) return

  const inputKeys = formatInput(mapMods(ev), mapKey(ev.key))
  if (shortcuts.has(inputKeys)) return shortcuts.get(inputKeys)!()

    // TODO: xform ; to ;s ;n ;e (as two chars) doesnt work because it gets wrapped in <>
    // refactor key.length > 1 logic to not trigger on transforms. maybe look at length and first char uppercase?
    console.log(inputKeys)
  e.preventDefault()
  input(inputKeys)
})

// no keyup events will be triggered for input value - slow anyways/vim doesn't care
window.addEventListener('keyup', e => {
  if (!isCapturing) return
  e.preventDefault()
  if (down === keToStr(e)) down = ''
})