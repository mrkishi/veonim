import { codeAction, onDiagnostics } from '../langserv/adapter'
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
  try {
    const res = await codeAction(state, cache.diagnostics)
    if (res) console.log('code action:', res)
  } catch(e) {
    console.warn('GOTTEM')
    console.error(e)
  }
})
