import { textDocument } from './director'
import { update, getLine, getFile } from './files'
import { dirname, basename, extname } from 'path'
import { merge } from '../utils'

process.on('unhandledRejection', e => console.error(e))

interface VimInfo {
  cwd: string,
  file: string,
  line: number,
  column: number,
}

interface Position {
  line: number,
  character: number,
}

interface Range {
  start: Position,
  end: Position,
}

interface TextEdit {
  newText: string,
  range: Range,
}

interface DocumentChange {
  textDocument: {
    uri: string
  },
  edits: TextEdit[]
}

// TODO: get typings for valid requests?
const toProtocol = (data: VimInfo, more?: any) => {
  const { cwd, file, line: vimLine, column } = data
  const uri = 'file://' + cwd + '/' + file

  const base = {
    cwd,
    language: extname(file).replace('.', ''),
    textDocument: {
      uri,
      version: Date.now()
    }
  }

  if (vimLine && column) merge(base, {
    position: {
      line: vimLine - 1,
      character: column - 1
    }
  })

  return more ? merge(base, more) : base
}

const uriToPath = (m: string) => m.replace(/^\S+:\/\//, '')
const asCwd = (m = '') => dirname(uriToPath(m)) 
const asFile = (m = '') => basename(uriToPath(m)) 
const toVimLocation = ({ line, character }: Position) => ({ line: line + 1, column: character + 1 })
const samePos = (s: Position, e: Position) => s.line === e.line && s.character === e.character
const makePatch = (cwd: string, file: string) => ({ newText, range: { start, end } }: TextEdit) => {
  const line = start.line + 1

  if (!newText) return { op: 'delete', line }
  if (samePos(start, end)) return { op: 'append', line, val: newText }

  const buffer = getLine(cwd, file, line)
  const val = buffer.slice(0, start.character) + newText + buffer.slice(end.character)
  return { op: 'replace', line, val }
}

const asQfList = ({ uri, range }: { uri: string, range: Range }) => {
  const { line, column } = toVimLocation(range.start)
  const cwd = asCwd(uri)
  const file = asFile(uri)
  const desc = getLine(cwd, file, line)

  return { cwd, file, line, column, desc }
}

const fullUpdate = (cwd: string, file: string, change: string[]) => {
  update(cwd, file, change)
  return change.join('\n')
}

const partialUpdate = (cwd: string, file: string, change: string, line: number) => {
  const buffer = getFile(cwd, file) || []
  const patched = buffer.slice().splice(line, 1, change)
  update(cwd, file, patched)
  return patched.join('\n')
}

// TODO: nope
export const bufferChanged = (data: any) => {
  const { cwd, file, change, lineChange, line } = data

  const text = lineChange
    ? partialUpdate(cwd, file, change, line)
    : fullUpdate(cwd, file, change)

  const content = { text }

  if (lineChange) merge(content, {
    range: {
      start: { line: line - 1, character: 0 },
      end: { line: line - 1, character: lineChange.length - 1 }
    }
  })

  const req = toProtocol(data, { contentChanges: [ content ] })
  textDocument.didChange(req)
}

export const definition = async (data: VimInfo) => {
  const req = toProtocol(data)
  const result = await textDocument.definition(req)
  if (!result) return
  return asQfList(result)
}

export const references = async (data: VimInfo) => {
  const req = toProtocol(data, {
    context: {
      includeDeclaration: true
    }
  })

  const references = await textDocument.references(req)
  return references.map(asQfList)
}

export const rename = async (data: VimInfo & { newName: string }) => {
  const req = toProtocol(data, {
    newName: data.newName
  })

  const { changes, documentChanges } = await textDocument.rename(req)

  if (documentChanges) return (documentChanges as DocumentChange[]).map(({ textDocument, edits }) => {
    const cwd = asCwd(textDocument.uri)
    const file = asFile(textDocument.uri)
    return { cwd, file, patch: edits.map(makePatch(cwd, file)) }
  })

  changes && console.error('rename needs to support .changes for patch')
  // TODO: handle { changes }
  // changes array is indexed by the uri?
  // changes[main.js] = { range, newText }
}

// TODO: get completions from language server. auto trigger is handled by vimtron
export const completions = async (_data: VimInfo) => {

}

// TODO: get signature hint from language server. figure out if (all langs) need position to
// be over the function or can be inside parens. if (can be inside parens) then migrate
// logic to js-langs to find function call
export const signatureHint = async (data: VimInfo) => {
  const req = toProtocol(data)
  const hint = await textDocument.signatureHelp(req)
  console.log(hint)

  //const hint = {
    //signatures: [{
      //label: 'text to be shown in the ui',
      //documentation?: 'doc comment for the UI',
      //parameters?: [{
        //label: 'ui label',
        //documentation?: 'ui doc'
      //}]
    //}],
    //activeSignature?: 0,
    //activeParameter?: 0
  //}
}
