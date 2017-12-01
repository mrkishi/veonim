import { signatureHelp, triggers } from '../langserv/adapter'
import { current as vimState, on } from '../core/neovim'
import * as hintUI from '../components/hint'
import { merge } from '../support/utils'
import vimUI from '../core/canvasgrid'

const cache = {
  totalParams: 0,
  currentParam: 0,
}

const shouldCloseSignatureHint = (totalParams: number, currentParam: number, triggers: string[], leftChar: string): boolean => {
  if (currentParam < totalParams - 1) return false

  const hasEasilyIdentifiableSymmetricalMatcherChar = triggers.some(t => ['(', '{', '['].includes(t))
  if (!hasEasilyIdentifiableSymmetricalMatcherChar) return true

  return (leftChar === ')' && triggers.includes('('))
    || (leftChar === '}' && triggers.includes('{'))
    || (leftChar === ']' && triggers.includes('['))
}

const getSignatureHint = async (lineContent: string) => {
  const triggerChars = triggers.signatureHelp(vimState.cwd, vimState.filetype)
  const leftChar = lineContent[Math.max(vimState.column - 2, 0)]

  // TODO: should probably also hide if we jumped to another line
  if (shouldCloseSignatureHint(cache.totalParams, cache.currentParam, triggerChars, leftChar)) {
    hintUI.hide()
    return
  }

  if (!triggerChars.includes(leftChar)) return

  const hint = await signatureHelp(vimState)
  if (!hint) return

  const { activeParameter, activeSignature, signatures = [] } = hint
  if (!signatures.length) return

  const { label = '', documentation = '', parameters = [] } = signatures[activeSignature || 0] || {}
  const { label: currentParam = '' } = parameters[activeParameter || 0] || {}

  merge(cache, {
    totalParams: parameters.length,
    currentParam: activeParameter,
  })

  // TODO: figure out a way to switch different signatures...
  // - cache signatures in state
  // - add actions :Veonim next-sig (can be keybound) (ctrl+shift+n?)
  // - on action switch active displayed signature/redraw

  hintUI.show({
    label,
    currentParam,
    row: vimUI.cursor.row,
    col: vimUI.cursor.col,
    info: documentation
  })
}

on.cursorMove(() => hintUI.hide())
on.insertEnter(() => hintUI.hide())
on.insertLeave(() => hintUI.hide())

export { getSignatureHint }
