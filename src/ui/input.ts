import { notify } from './neovim-client'
import { $ } from '../utils'

const { input } = notify
const modifiers = ['Alt', 'Shift', 'Meta', 'Control']
const remaps = new Map<string, string>()
let isCapturing = false
let holding: string

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

export const remapModifier = (from: string, to: string) => remaps.set(from, to)
export const focus = () => isCapturing = true
export const blur = () => isCapturing = false
export const registerShortcut = (keys: string, cb: Function) => shortcuts.set(`<${keys.toUpperCase()}>`, cb)

type Transformer = (input: KeyboardEvent) => KeyboardEvent
const xforms = new Map<string, Transformer>()
const upforms = new Map<string, Transformer>()

const keToStr = (e: KeyboardEvent) => [e.key, <any>e.ctrlKey|0, <any>e.metaKey|0, <any>e.altKey|0, <any>e.shiftKey|0].join('')

export const addTransformerDown = (e: KeyboardEvent, fn: Transformer) => xforms.set(keToStr(e), fn)
export const addTransformUp = (e: KeyboardEvent, fn: Transformer) => upforms.set(keToStr(e), fn)

const defkey = {...new KeyboardEvent('keydown'), key: '', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false}
addTransformerDown({...defkey, key: `;`}, e => ({...e, key: ';' + e.key}))
// addTransformUp({...defkey, key: 'Meta'}, e => ({...e, key: 'Escape'}))

let transforming = false

const sendKeys = (e: KeyboardEvent) => {
  const inputKeys = formatInput(mapMods(e), mapKey(e.key))
  if (shortcuts.has(inputKeys)) return shortcuts.get(inputKeys)!()
  if (inputKeys.length > 1 && !inputKeys.startsWith('<')) inputKeys.split('').forEach((k: string) => input(k))
  else input(inputKeys)
}

window.addEventListener('keydown', e => {
  e.preventDefault()
  if (!isCapturing) return
  const strKey = keToStr(e)

  if (xforms.has(strKey)) {
    holding = strKey
    return
  }

  if (!xforms.has(holding)) {
    holding = strKey
    transforming = false
  }
  else transforming = true

  const ev = xforms.has(holding) ? xforms.get(holding)!(e) : e
  const key = bypassEmptyMod(ev.key)
  if (!key) return

  sendKeys(ev)
})

window.addEventListener('keyup', e => {
  e.preventDefault()
  if (!isCapturing) return
  const strKey = keToStr(e)
  
  // TODO: Lol this is maximum dirty hack
  // TODO: after hold + transform, need to release so we can type again
  // aka xform on ; -> ; + key
  // then this happens
  // <alone>;;;;<holding>;s;d;s<let go><TRY-alone-BUT-FAIL>;
  // only if type another char that is not ; then it resets back
  if (keToStr(e) === 'Meta0000' && holding === 'Meta0100') return input(`<Esc>`)

  if (holding === strKey) {
    if (xforms.has(holding) && !transforming) sendKeys(e)

    else if (upforms.has(holding)) {
      const ev = upforms.get(holding)!(e)
      sendKeys(ev)
    }

    holding = ''
  }

  // else if (upforms.has(strKey)) {
  //   const ev = upforms.get(strKey)!(e)
  //   sendKeys(ev)
  // }
})