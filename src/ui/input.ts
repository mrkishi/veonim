import { input, resize, attach, switch1, switch2 } from '../neovim'
import { pub } from './pubsub'
import { $ } from '../utils'
import { Api } from './canvasgrid'

let isCapturing = false
const modifiers = ['Alt', 'Shift', 'Meta', 'Control']
const remaps = new Map<string, string>()

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

let myui: Api
let io: Worker
export const setUI = (ui: any, iop: Worker) => {
  myui = ui
  io = iop
  io.onmessage = e => {
    console.log('recv', e.data)
  }
}

let init2 = false
let vim = 1

window.addEventListener('keydown', e => {
  if (!isCapturing) return
  const key = bypassEmptyMod(e.key)
  if (!key) return


  const inputKeys = formatInput(mapMods(e), mapKey(e.key))
  io.postMessage({ key: inputKeys })
  if (inputKeys === '<S-C-F>') return pub('fullscreen')

  if (inputKeys === '<S-C-T>') {
    if (vim === 1) {
      switch2()
      if (!init2) attach(myui.cols, myui.rows)
      resize(myui.cols, myui.rows)
      vim = 2
    } else if (vim === 2) {
      switch1()
      resize(myui.cols, myui.rows)
      vim = 1
    }

    return
  }

  e.preventDefault()
  input(inputKeys)
})
