import * as dispatch from '../messaging/dispatch'
import { filter as fuzzy } from 'fuzzaldrin-plus'
import { input, inputAndWait, callAtomic } from '../core/master-control'
import { $, mergeValid, debounce } from '../support/utils'

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

const vim = {
  mode: 'normal',
  cmd: '',
  menu: [] as string[],
  completeIx: 0,
  position: 0,
  menuIx: -1,
  cmdQuery: '',
  options: [] as string[],
  rewindTo: -33,
  lastPosition: -22,
}

//const backs = ['<BS>', '<C-w']

dispatch.sub('vim:mode', m => vim.mode = m)
dispatch.sub('cmd.update', ({ cmd, position }) => {
  mergeValid(vim, { cmd, position })
})

const reset = () => {
  vim.cmd = ''
  vim.menu = []
  vim.completeIx = 0
  vim.position = 0
  vim.menuIx = -1
  vim.cmdQuery = ''
  vim.options = []
  vim.rewindTo = -33
  vim.lastPosition = -22
}

dispatch.sub('cmd.update', debounce(async ({ cmd, position }: { cmd: string, position: number }) => {
  console.log('cmd render', position, JSON.stringify(cmd))

  console.log('vim.lastPosition', vim.lastPosition)
  const noCmd = vim.lastPosition === 0 && !cmd
  const backspaceMethod = vim.lastPosition === 1 && position === 1
  const ctrlWMethod = vim.lastPosition > 0 && position === 1 && cmd === '!'

  if (noCmd) return

  if (backspaceMethod || ctrlWMethod) {
    input('<C-w>')
    reset()
    dispatch.pub('wildmenu.reallyShow', [])
    return
  }

  if (vim.rewindTo > 0 && position > vim.rewindTo) {
    const bsAmt = position - vim.rewindTo
    rewind(bsAmt)
    return
  }

  dispatch.pub('cmd.rupdate', { cmd, position })

  const cutFrom = vim.completeIx < 1 ? 0 : vim.completeIx + 1
  vim.cmdQuery = cmd.slice(cutFrom)

  const results = fuzzy(vim.menu, vim.cmdQuery)
  vim.options = results.length ? results : vim.menu

  dispatch.pub('wildmenu.reallyShow', vim.options)
}, 1))

dispatch.sub('cmd.hide', () => {
  console.log('BUH BYE UR DONE LOL')
  dispatch.pub('cmd.reallyhide')

  reset()
})

dispatch.sub('wildmenu.show', (menu = []) => {
  const isSubset = (menu as string[]).every(m => vim.menu.includes(m))
  if (menu.length && !isSubset) {
    vim.menu = menu
    vim.completeIx = vim.rewindTo - 1
  }
})

const captureMenuOpts = async () => {
  // TODO: there is a neovim bug? (maybe? confirm?) that prints '...'
  // whenever you hit some sort of control key combo (tab, c-a, etc.)
  //
  // should create a simple test-case and submit neovim bug. or verify if my
  // issue or neovim bug

  //input('<Tab>')
  //input('<Esc>')
  //input(':')

  vim.rewindTo = vim.position
  input('<Tab>')
}

//const rewind = (amount = 0) => amount > 0 && [...Array(amount)].forEach(() => input('<BS>'))
//const rewind = (amount = 0) => amount > 0 && Promise.all([...Array(amount)].map(() => inputAndWait('<BS>')))

const rewind = (amount = 0) => {
  if (amount < 1) return
  const calls = [...Array(amount)].map(() => ['nvim_input', ['<BS>']])
  return callAtomic(...calls)
}

const sendKeys = async (e: KeyboardEvent) => {
  const key = bypassEmptyMod(e.key)
  if (!key) return
  const inputKeys = formatInput(mapMods(e), mapKey(e.key))

  if (vim.mode === 'cmdline_normal') {

    if (inputKeys === '<Tab>') {
      vim.rewindTo = -33
      const cutFrom = !vim.completeIx ? 0 : vim.completeIx + 1

      if (vim.menuIx < 0) vim.cmdQuery = vim.cmd.slice(cutFrom)

      vim.menuIx++

      if (vim.menuIx > vim.options.length - 1) vim.menuIx = -1

      dispatch.pub('wildmenu.reallySelect', vim.menuIx)

      const selection = vim.menuIx < 0 ? vim.cmdQuery : vim.options[vim.menuIx]

      const correctionAmt = vim.position - cutFrom

      await rewind(correctionAmt)
      selection.split('').forEach(m => input(m))
    }

    else {
      console.log('@@', inputKeys)
      vim.lastPosition = vim.position
      await inputAndWait(inputKeys)
      captureMenuOpts()
    }

  }

  else {
    if (shortcuts.has(inputKeys)) return shortcuts.get(inputKeys)!()
    if (inputKeys.length > 1 && !inputKeys.startsWith('<')) inputKeys.split('').forEach((k: string) => input(k))
    else input(inputKeys)
  }
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

  const prevKeyAndThisOne = lastDown + es
  if (xfrmUp.has(prevKeyAndThisOne)) return sendKeys(xfrmUp.get(prevKeyAndThisOne)!(e))

  if (holding === es) {
    if (!xformed) sendKeys(e)
    xformed = false
    holding = ''
  }
})
