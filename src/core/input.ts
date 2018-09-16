import { $, Watchers, is, fromJSON } from '../support/utils'
import { input } from '../core/master-control'
import { touched } from '../bootstrap/galaxy'
import { VimMode } from '../neovim/types'
import { remote } from 'electron'
import nvim from '../core/neovim'
import { Script } from 'vm'

export enum InputMode {
  Vim = 'vim',
  Motion = 'motion',
}

export enum InputType {
  Down = 'down',
  Up = 'up',
}

const modifiers = ['Alt', 'Shift', 'Meta', 'Control']
const remaps = new Map<string, string>()
const inputWatchers = new Watchers()
let isCapturing = false
let holding = ''
let xformed = false
let lastDown = ''
let initalVimStartupKeypress = true
let windowHasFocus = true
let lastEscapeTimestamp = 0
let shouldClearEscapeOnNextAppFocus = false
let activeInputMode = InputMode.Vim

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

// TODO: instead of 'mode' being a string, perhaps we can use the VimMode enum?
export const registerShortcut = (keys: string, mode: string, cb: Function) =>
  shortcuts.set(`${mode}:<${keys.toUpperCase()}>`, cb)

const resetInputState = () => {
  xformed = false
  lastDown = ''
  holding = ''
}

export const focus = () => {
  isCapturing = true
  resetInputState()
}

export const blur = () => {
  isCapturing = false
  resetInputState()
}

// TODO: can we use transform to do the same thing as remapModifier? seems similar
export const remapModifier = (from: string, to: string) => remaps.set(from, to)

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

// TODO: why not combine switchInputMode + watchInputMode together in the same
// function. when would we be switching input modes without also watching for
// input? or switching input mode but watching another mode instead?
// or when we would switch input mode to vim? and watch it? mehhh
// it's either vim or custom input mode...
// (i think the reason we have multiple modes is to allow custom bindings
// in each specific mode)
// perhaps we should also return the stop() method so our changing
// custom input method entry point is only one func. i think even if we wanted
// to switch from custom input mode to custom input mode, we should be able to
// do it with one function
//
// stop() could optionally accept an INputMode to switch to. otherwise default
// back to InputMOde.Vim
export const switchInputMode = (mode: InputMode) => activeInputMode = mode
// TODO: i think we should get rid of this and just use switchInputMode(InputMode.Vim)
export const defaultInputMode = () => activeInputMode = InputMode.Vim

export const watchInputMode = (mode: InputMode, fn: (inputKeys: string, inputType: InputType) => void) => {
  const onDown = (inputKeys: string) => fn(inputKeys, InputType.Down)
  const onUp = (inputKeys: string) => fn(inputKeys, InputType.Up)
  const eventDown = `${InputType.Down}:${mode}`
  const eventUp = `${InputType.Up}:${mode}`

  inputWatchers.add(eventDown, onDown)
  inputWatchers.add(eventUp, onUp)

  // TODO: why not just remove this when we switch input modes back to Vim or
  // something else?  are there use cases where we want to stop watching input
  // but NOT switch to another mode? seems like the user would just be stuck
  // in limbo without accepting input modes...
  return () => {
    inputWatchers.remove(eventDown, onDown)
    inputWatchers.remove(eventUp, onUp)
  }
}

const sendToVim = (inputKeys: string) => {
  // TODO: this might need more attention. i think s-space can be a valid
  // vim keybind. s-space was causing issues in terminal mode, sending weird
  // term esc char.
  if (inputKeys === '<S-Space>') return input('<space>')
  if (shortcuts.has(`${nvim.state.mode}:${inputKeys}`)) return shortcuts.get(`${nvim.state.mode}:${inputKeys}`)!()
  if (inputKeys.length > 1 && !inputKeys.startsWith('<')) inputKeys.split('').forEach((k: string) => input(k))
  else {
    // a fix for terminal. only happens on cmd-tab. see below for more info
    if (inputKeys.toLowerCase() === '<esc>') lastEscapeTimestamp = Date.now()
    input(inputKeys)
  }
}

const sendToMotion = (inputKeys: string, inputType: InputType) => {
  inputWatchers.notify(`${inputType}:${InputMode.Motion}`, inputKeys)
}

const sendKeys = async (e: KeyboardEvent, inputType: InputType) => {
  // TODO: this doesn't work anymore. something is sending a keypress
  // event on app startup. we should be using shadow buffers for this
  // anyways for a proper startup screen. plskthx
  if (initalVimStartupKeypress) {
    initalVimStartupKeypress = false
    touched()
  }

  const key = bypassEmptyMod(e.key)
  if (!key) return
  const inputKeys = formatInput(mapMods(e), mapKey(e.key))

  if (activeInputMode === InputMode.Vim) return sendToVim(inputKeys)
  if (activeInputMode === InputMode.Motion) return sendToMotion(inputKeys, inputType)
}

window.addEventListener('keydown', e => {
  if (!windowHasFocus || !isCapturing) return

  const es = keToStr(e)
  lastDown = es

  if (xfrmDown.has(es)) {
    const remapped = xfrmDown.get(holding)!(e)
    sendKeys(remapped, InputType.Down)
    return
  }

  if (xfrmHold.has(es)) {
    holding = es
    return
  }

  if (xfrmHold.has(holding)) {
    const remapped = xfrmHold.get(holding)!(e)
    sendKeys(remapped, InputType.Down)
    xformed = true
    return
  }

  sendKeys(e, InputType.Down)
})

window.addEventListener('keyup', e => {
  if (!windowHasFocus || !isCapturing) return

  // one of the observed ways in which we can have a 'keyup' event without a
  // 'keydown' event is when the window receives focus while a key is already
  // pressed. this will happen with key combos like cmd+tab or alt+tab to
  // switch applications in mac/windows. there is probably no good reason to
  // send the keyup event key to neovim. in fact, this causes issues if we have
  // a xform mapping of cmd -> escape, as it sends an 'esc' key to neovim
  // terminal, thus swallowing the first key after app focus
  if (!lastDown) return
  const es = keToStr(e)

  const prevKeyAndThisOne = lastDown + es
  if (xfrmUp.has(prevKeyAndThisOne)) return sendKeys(xfrmUp.get(prevKeyAndThisOne)!(e), InputType.Up)

  if (holding === es) {
    if (!xformed) sendKeys(e, InputType.Up)
    xformed = false
    holding = ''
  }
})

// TODO: deprecate remapModifier and use transform instead?
nvim.onAction('remap-modifier', (from, to) => remapModifier(from, to))

nvim.onAction('register-shortcut', (key, mode) => registerShortcut(key, mode, () => nvim.call.VeonimCallEvent(`key:${mode}:${key}`)))

nvim.onAction('key-transform', (type, matcher, transformer) => {
  const fn = Reflect.get(transform, type)
  const transformFn = new Script(transformer).runInThisContext()
  const matchObj = is.string(matcher) ? fromJSON(matcher).or({}) : matcher

  if (is.function(fn) && is.function(transformFn)) fn(matchObj, transformFn)
})

remote.getCurrentWindow().on('focus', () => {
  windowHasFocus = true
  resetInputState()
  if (shouldClearEscapeOnNextAppFocus) {
    // so if i remap 'cmd' down+up -> 'esc' and then hit cmd+tab to switch apps
    // while in a terminal buffer, the application captures the 'cmd' (xform to
    // 'esc') but not the 'tab' key. because of the xform to 'esc' this sends
    // an escape sequence to the terminal. once the app gains focus again, the
    // first char in the terminal buffer will be "swallowed". very annoying if
    // copypasta commands, the first char gets lost and have to re-pasta

    // i couldn't figure out an elegant solution to this (tried native
    // keylistening but too much effort/unreliable), and decided to check if an
    // 'esc' key was sent immediately before the app lost focus && we were in
    // terminal insert mode. when the app gains focus again, we can "clear" the
    // previous erranous 'escape' key sent to the terminal. this might only
    // happen on macos + my custom config of remapping cmd -> cmd/esc
    input('<enter>')
    shouldClearEscapeOnNextAppFocus = false
  }
})

remote.getCurrentWindow().on('blur', async () => {
  windowHasFocus = false
  resetInputState()

  const lastEscapeFromNow = Date.now() - lastEscapeTimestamp
  const isTerminalMode = nvim.state.mode === VimMode.Terminal
  const fixTermEscape = isTerminalMode && lastEscapeFromNow < 25
  if (fixTermEscape) shouldClearEscapeOnNextAppFocus = true
})
