import { supports, getTriggerChars } from '../langserv/server-features'
import { SignatureInformation } from 'vscode-languageserver-protocol'
import { signatureHelp } from '../langserv/adapter'
import { action, on } from '../core/neovim'
import { merge } from '../support/utils'
import { cursor } from '../core/cursor'
import { ui } from '../components/hint'
import vim from '../neovim/state'

const cache = {
  signatures: [] as SignatureInformation[],
  selectedSignature: 0,
  totalParams: 0,
  currentParam: 0,
}

const shouldCloseSignatureHint = (totalParams: number, currentParam: number, triggers: Set<string>, leftChar: string): boolean => {
  if (currentParam < totalParams - 1) return false

  const matching = triggers.has('(') || triggers.has('{') || triggers.has('[')
  if (!matching) return true

  return (leftChar === ')' && triggers.has('('))
    || (leftChar === '}' && triggers.has('{'))
    || (leftChar === ']' && triggers.has('['))
}

const cursorPos = () => ({ row: cursor.row, col: cursor.col })

const showSignature = (signatures: SignatureInformation[], which?: number | null, param?: number | null) => {
  const { label = '', documentation = '', parameters = [] } = signatures[which || 0]
  const activeParameter = param || 0

  const baseOpts = { ...cursorPos(), totalSignatures: signatures.length }

  if (activeParameter < parameters.length) {
    const { label: currentParam = '', documentation: paramDoc } = parameters[activeParameter]
    cache.totalParams = parameters.length

    ui.show({
      ...baseOpts,
      label,
      currentParam,
      // TODO: support MarkupContent
      paramDoc: paramDoc as any,
      // TODO: support MarkupContent
      documentation: documentation as any,
      selectedSignature: (which || 0) + 1,
    })
  }

  else {
    const nextSignatureIndex = signatures
      .slice()
      .filter(s => s.parameters && s.parameters.length)
      .sort((a, b) => a.parameters!.length - b.parameters!.length)
      .findIndex(s => s.parameters!.length > activeParameter)

    if (!~nextSignatureIndex) return ui.hide()

    const { label = '', documentation = '', parameters = [] } = signatures[nextSignatureIndex]
    const { label: currentParam = '' } = parameters[activeParameter]
    merge(cache, { selectedSignature: nextSignatureIndex, totalParams: parameters.length })

    ui.show({
      ...baseOpts,
      label,
      currentParam,
      // TODO: support MarkupContent
      documentation: documentation as any,
      selectedSignature: nextSignatureIndex + 1,
    })
  }
}

const getSignatureHint = async (lineContent: string) => {
  const triggerChars = getTriggerChars.signatureHint(vim.cwd, vim.filetype)
  const leftChar = lineContent[Math.max(vim.column - 1, 0)]

  // TODO: should probably also hide if we jumped to another line
  // how do we determine the difference between multiline signatures and exit signature?
  // would need to check if cursor is outside of func brackets doShit(    )   | <- cursor
  const closeSignatureHint = shouldCloseSignatureHint(cache.totalParams, cache.currentParam, triggerChars, leftChar)
  if (closeSignatureHint) return ui.hide()

  if (!triggerChars.has(leftChar)) return
  if (!supports.signatureHint(vim.cwd, vim.filetype)) return

  const hint = await signatureHelp(vim)
  if (!hint) return

  const { activeParameter, activeSignature, signatures = [] } = hint
  if (!signatures.length) return

  merge(cache, { signatures, currentParam: activeParameter, selectedSignature: 0 })
  showSignature(signatures, activeSignature, activeParameter)
}

on.cursorMove(ui.hide)
on.insertEnter(ui.hide)
on.insertLeave(ui.hide)

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
