import { Position, Range, TextEdit, WorkspaceEdit } from 'vscode-languageserver-types'
import { textDocument, onServerRequest, getSyncKind, SyncKind } from './director'
import { update, getLine, getFile } from './files'
import { dirname, basename } from 'path'
import { is, merge } from '../utils'

// TODO: revise to be the best interface that it can be. i believe in you. you can do it
interface VimInfo {
  cwd: string,
  file: string,
  line: number,
  column?: number,
  filetype?: string,
  revision?: number,
}

export interface PatchOperation {
  op: string,
  line: number,
  val?: string,
}

export interface Patch {
  cwd: string,
  file: string,
  operations: PatchOperation[],
}

interface VimQFItem {
  cwd: string,
  file: string,
  line: number,
  column: number,
  desc: string,
}

interface BufferChange {
  cwd: string,
  file: string,
  buffer: string[],
  line: number,
  column: number,
  filetype: string,
  revision: number,
}

// TODO: get typings for valid requests?
const toProtocol = (data: VimInfo, more?: any) => {
  const { cwd, filetype, file, line: vimLine, column } = data
  const uri = 'file://' + cwd + '/' + file

  const base = {
    cwd,
    filetype,
    textDocument: {
      uri,
      version: Date.now()
      // TODO: about that revision... does it make sense?
      // especially if jumping back and forth between revision and date.
      //version: revision > 0 ? revision : Date.now()
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

// TODO: move to utils?
const uriToPath = (m: string) => m.replace(/^\S+:\/\//, '')
const asCwd = (m = '') => dirname(uriToPath(m)) 
const asFile = (m = '') => basename(uriToPath(m)) 
const toVimLocation = ({ line, character }: Position) => ({ line: line + 1, column: character + 1 })
const samePos = (s: Position, e: Position) => s.line === e.line && s.character === e.character

const makePatch = (cwd: string, file: string) => ({ newText, range: { start, end } }: TextEdit): PatchOperation => {
  const line = start.line + 1

  if (!newText) return { op: 'delete', line }
  if (samePos(start, end)) return { op: 'append', line, val: newText }

  const buffer = getLine(cwd, file, line)
  const val = buffer.slice(0, start.character) + newText + buffer.slice(end.character)
  return { op: 'replace', line, val }
}

const asQfList = ({ uri, range }: { uri: string, range: Range }): VimQFItem => {
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

const patchBufferCacheWithPartial = (cwd: string, file: string, change: string, line: number): void => {
  const buffer = getFile(cwd, file)
  const patched = buffer.slice().splice(line, 1, change)
  update(cwd, file, patched)
}

export const fullBufferUpdate = ({ cwd, file, buffer, line, filetype }: BufferChange) => {
  const content = { text: fullUpdate(cwd, file, buffer) }
  const req = toProtocol({ cwd, file, line }, { contentChanges: [ content ], filetype })
  textDocument.didChange(req)
}

export const partialBufferUpdate = (change: BufferChange) => {
  const { cwd, file, buffer, line, filetype } = change
  const syncKind = getSyncKind(cwd, filetype)

  patchBufferCacheWithPartial(cwd, file, buffer[0], line)

  if (syncKind !== SyncKind.Incremental) return fullBufferUpdate({ ...change, buffer: getFile(cwd, file) })

  const content = {
    text: buffer[0],
    range: {
      start: { line: line - 1, character: 0 },
      end: { line: line - 1, character: buffer.length - 1 }
    }
  }

  const req = toProtocol({ cwd, file, line }, { contentChanges: [ content ], filetype })
  textDocument.didChange(req)
}

export const definition = async (data: VimInfo) => {
  const req = toProtocol(data)
  const result = await textDocument.definition(req)
  if (!result) return
  return asQfList(is.array(result) ? result[0] : result)
}

// TODO: use a better thingy type thingy pls k thx
export const references = async (data: VimInfo): Promise<VimQFItem[]> => {
  const req = toProtocol(data, {
    context: {
      includeDeclaration: true
    }
  })

  const references = await textDocument.references(req) || []
  return references.map(asQfList)
}

const asPatch = (filepath: string, edits: TextEdit[]): Patch => {
  const cwd = asCwd(filepath)
  const file = asFile(filepath)
  return { cwd, file, operations: edits.map(makePatch(cwd, file)) }
}

export const rename = async (data: VimInfo & { newName: string }): Promise<Patch[]> => {
  const req = toProtocol(data, { newName: data.newName })
  const { changes, documentChanges } = await textDocument.rename(req) as WorkspaceEdit

  if (documentChanges) return documentChanges.map(({ textDocument, edits }) => asPatch(textDocument.uri, edits))
  if (changes) return Object.entries(changes).map(([ file, edits ]) => asPatch(file, edits))
  return []
}

// TODO: get completions from language server. auto trigger is handled by vimtron
export const completions = async (_data: VimInfo) => {

}

// TODO: get signature hint from language server. figure out if (all langs) need position to
// be over the function or can be inside parens. if (can be inside parens) then migrate
// logic to js-langs to find function call
export const signatureHelp = async (data: VimInfo) => {
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

export { onServerRequest }
