import { codeAction, onDiagnostics } from '../langserv/adapter'
import { positionWithinRange } from '../support/neovim-utils'
import { Diagnostic } from 'vscode-languageserver-types'
import { merge } from '../support/utils'
import { on } from '../core/neovim'

const cache = {
  uri: '',
  diagnostics: [] as Diagnostic[]
}

onDiagnostics(m => {
  console.log('PROBLEMS FOR:', m.uri, m.diagnostics)
  merge(cache, m)
})

on.cursorMove(async state => {
  const { line, column } = state

  const relevantDiagnostics = cache
    .diagnostics
    .filter(d => positionWithinRange(line - 1, column - 1, d.range))

  const res = await codeAction(state, relevantDiagnostics)
  // TODO: change cursor color i guess...
  // what is the stuff on the columnbar? code lens?
  res && res.length && console.log('do something with these code actions:', res)
})
