import { input } from '../neovim'
import { pub } from './pubsub'

const $ = (...fns: Function[]) => (...a: any[]) => fns.reduce((res, fn, ix) => ix ? fn(res) : fn(...res), a)

let isCapturing = false
const modifiers = ['Alt', 'Shift', 'Meta', 'Control']
const remaps = new Map<string, string>()

const handleMods = ({ ctrlKey, shiftKey, metaKey, altKey }: KeyboardEvent) => {
  const mods: string[] = []
  // macos sends these fancy unicodes instead Ô∆ß on alt/alt+shift
  const notCmdOrCtrl = !metaKey && !ctrlKey
  const macOSUnicode = process.platform === 'darwin' 
    && (altKey && notCmdOrCtrl)
    || (altKey && shiftKey && notCmdOrCtrl)

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
const wrapKey = (key: string): string => key.length > 1 ? `<${key}>` : key
const combineModsWithKey = (mods: string, key: string) => mods.length ? `${mods}-${key}` : key
const userModRemaps = (mods: string[]) => mods.map(m => remaps.get(m) || m)
const joinModsWithDash = (mods: string[]) => mods.join('-')
const mapMods = $(handleMods, userModRemaps, joinModsWithDash)
const mapKey = $(bypassEmptyMod, toVimKey)
const formatInput = $(combineModsWithKey, wrapKey)

export const remapModifier = (from: string, to: string) => remaps.set(from, to)
export const focus = () => isCapturing = true
export const blur = () => isCapturing = false

window.addEventListener('keydown', e => {
  if (!isCapturing) return
  const key = bypassEmptyMod(e.key)
  if (!key) return

  const inputKeys = formatInput(mapMods(e), mapKey(e.key))
  if (inputKeys === '<D-r>') return pub('reload')

  e.preventDefault()
  input(inputKeys)
})