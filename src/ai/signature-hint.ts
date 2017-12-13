import { SignatureInformation } from 'vscode-languageserver-types'
import { action, current as vimState, on } from '../core/neovim'
import { signatureHelp, triggers } from '../langserv/adapter'
import * as hintUI from '../components/hint'
import { merge } from '../support/utils'
import vimUI from '../core/canvasgrid'

const cache = {
  signatures: [] as SignatureInformation[],
  selectedSignature: 0,
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

const showSignature = (signatures: SignatureInformation[], which?: number | null, param?: number | null) => {
  const { label = '', documentation = '', parameters = [] } = signatures[which || 0]
  const { label: currentParam = '' } = parameters[param || 0]

  cache.totalParams = parameters.length

  hintUI.show({
    label,
    currentParam,
    row: vimUI.cursor.row,
    col: vimUI.cursor.col,
    info: documentation,
    selectedSignature: (which || 0) + 1,
    totalSignatures: signatures.length,
  })
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

  console.log('signature hints:', signatures.length)

  merge(cache, { signatures, currentParam: activeParameter, selectedSignature: 0 })
  showSignature(signatures, activeSignature, activeParameter)
}

on.cursorMove(() => hintUI.hide())
on.insertEnter(() => hintUI.hide())
on.insertLeave(() => hintUI.hide())

action('signature-help-next', () => {
  const next = cache.selectedSignature + 1
  cache.selectedSignature = next >= cache.signatures.length ? 0 : next
  cache.currentParam = 0

  showSignature(cache.signatures, cache.selectedSignature)
})

action('signature-help-prev', () => {
  const next = cache.selectedSignature - 1
  cache.selectedSignature = next < 0 ? cache.signatures.length - 1 : next
  cache.currentParam = 0

  showSignature(cache.signatures, cache.selectedSignature)
})

export { getSignatureHint }
