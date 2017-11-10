import { Location, Position, Range, TextEdit, WorkspaceEdit, Hover, SignatureHelp, SymbolInformation, SymbolKind, CompletionItem } from 'vscode-languageserver-types'
import { notify, workspace, textDocument, onServerRequest, getSyncKind, SyncKind, triggers } from './director'
import { is, merge, uriAsCwd, uriAsFile } from '../utils'
import { update, getLine, getFile } from './files'
import { NeovimState } from '../ui/neovim'

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

export interface Symbol {
  name: string,
  kind: SymbolKind,
  location: VimLocation,
  containerName?: string,
}

interface VimLocation {
  cwd: string,
  file: string,
  position: VimPosition,
}

interface VimQFItem {
  desc: string,
  column: number,
  file: string,
  line: number,
  cwd: string,
}

interface BufferChange extends NeovimState {
  buffer: string[],
}

interface MarkedStringPart {
  language: string,
  value: string,
}

interface VimPosition {
  line: number,
  column: number,
}

const openFiles = new Set<string>()

// TODO: get typings for valid requests?
const toProtocol = (data: NeovimState, more?: any) => {
  const { cwd, filetype, file, line: vimLine, column, revision } = data
  const uri = 'file://' + cwd + '/' + file

  const base = {
    cwd,
    filetype,
    textDocument: {
      uri,
      version: revision,
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

const toVimPosition = ({ line, character }: Position): VimPosition => ({ line: line + 1, column: character + 1 })
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
  const { line, column } = toVimPosition(range.start)
  const cwd = uriAsCwd(uri)
  const file = uriAsFile(uri)
  const desc = getLine(cwd, file, line)

  return { cwd, file, line, column, desc }
}

const patchBufferCacheWithPartial = (cwd: string, file: string, change: string, line: number): void => {
  const buffer = getFile(cwd, file)
  const patched = buffer.slice()
  Reflect.set(patched, line - 1, change)
  update(cwd, file, patched)
}

export const fullBufferUpdate = (bufferState: BufferChange) => {
  const { cwd, file, buffer, filetype } = bufferState
  update(cwd, file, buffer)

  const content = { text: buffer.join('\n') }
  const req = toProtocol(bufferState, { contentChanges: [ content ], filetype })

  openFiles.has(cwd + file)
    ? notify.textDocument.didChange(req)
    : (openFiles.add(cwd + file), notify.textDocument.didOpen(req))
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

  const req = toProtocol(change, { contentChanges: [ content ], filetype })

  openFiles.has(cwd + file)
    ? notify.textDocument.didChange(req)
    : (openFiles.add(cwd + file), notify.textDocument.didOpen(req))
}

export const definition = async (data: NeovimState): Promise<VimQFItem> => {
  const req = toProtocol(data)
  const result = await textDocument.definition(req)
  if (!result) return {} as VimQFItem
  return asQfList(is.array(result) ? result[0] : result)
}

export const references = async (data: NeovimState): Promise<VimQFItem[]> => {
  const req = toProtocol(data, {
    context: {
      includeDeclaration: true
    }
  })

  const references = await textDocument.references(req) || []
  return references.map(asQfList)
}

const asPatch = (filepath: string, edits: TextEdit[]): Patch => {
  const cwd = uriAsCwd(filepath)
  const file = uriAsFile(filepath)
  return { cwd, file, operations: edits.map(makePatch(cwd, file)) }
}

export const rename = async (data: NeovimState & { newName: string }): Promise<Patch[]> => {
  const req = toProtocol(data, { newName: data.newName })
  const { changes, documentChanges } = await textDocument.rename(req) as WorkspaceEdit

  if (documentChanges) return documentChanges.map(({ textDocument, edits }) => asPatch(textDocument.uri, edits))
  if (changes) return Object.entries(changes).map(([ file, edits ]) => asPatch(file, edits))
  return []
}

export const hover = async (data: NeovimState): Promise<string> => {
  const req = toProtocol(data)
  const res = await textDocument.hover(req) as Hover
  if (!res) return ''
  const { contents } = res

  // TODO: there is more than meets the eye here. make sure we are grabbing all the data
  // that we need. could be all sorts of other goodies hidden in here. TREASURE HUNT YAY
  if (is.string(contents)) return (contents as string)
  if (is.object(contents)) return (contents as MarkedStringPart).value
  if (is.array(contents)) return (contents as MarkedStringPart[])
    .filter(is.object)
    .map(m => m.value)[0]

  return ''
}

const toVimLocation = ({ uri, range }: Location): VimLocation => ({
  cwd: uriAsCwd(uri),
  file: uriAsFile(uri),
  position: toVimPosition(range.start),
})

export const symbols = async (data: NeovimState): Promise<Symbol[]> => {
  const req = toProtocol(data)
  const symbols = await textDocument.documentSymbol(req) as SymbolInformation[]
  if (!symbols || !symbols.length) return []
  return symbols.map(s => ({ ...s, location: toVimLocation(s.location) }))
}

export const workspaceSymbols = async (data: NeovimState): Promise<Symbol[]> => {
  const req = toProtocol(data)
  const symbols = await workspace.symbol(req) as SymbolInformation[]
  if (!symbols || !symbols.length) return []
  return symbols.map(s => ({ ...s, location: toVimLocation(s.location) }))
}

export const completions = async (data: NeovimState): Promise<CompletionItem[]> => {
  const req = toProtocol(data)
  const res = await textDocument.completion(req)
  // TODO: handle isIncomplete flag in completions result
  // docs: * This list it not complete. Further typing should result in recomputing this list
  return is.object(res) && res.items ? res.items : res
}

export const signatureHelp = async (data: NeovimState) => {
  const req = toProtocol(data)
  return await textDocument.signatureHelp(req) as SignatureHelp
}

export { onServerRequest, triggers }
