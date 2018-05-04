import { CodeLens, Diagnostic, Command, Location, Position, Range,
  WorkspaceEdit, Hover, SignatureHelp, SymbolInformation, SymbolKind,
  CompletionItem, DocumentHighlight } from 'vscode-languageserver-types'
import { notify, workspace, textDocument, completionItem, getSyncKind,
  SyncKind, triggers } from '../langserv/director'
import { NeovimState, applyPatches, current as vim } from '../core/neovim'
import { is, merge, uriToPath, uriAsCwd, uriAsFile } from '../support/utils'
import { Patch, workspaceEditToPatch } from '../langserv/patch'
import { getLines } from '../support/get-file-contents'
import config from '../config/config-service'
import * as path from 'path'

export { onDiagnostics } from '../langserv/director'

export interface Symbol {
  name: string,
  kind: SymbolKind,
  location: VimLocation,
  containerName?: string,
}

interface HoverResult {
  value?: string,
  doc?: string,
}

interface VimLocation {
  cwd: string,
  file: string,
  position: VimPosition,
}

export interface VimQFItem {
  desc: string,
  column: number,
  file: string,
  line: number,
  cwd: string,
  endLine: number,
  endColumn: number,
  keyword?: string,
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

interface CurrentBuffer {
  cwd: string,
  file: string,
  contents: string[],
}

const openFiles = new Set<string>()
// TODO: i wonder if we can rid of currentBuffer.contents once we get
// the fancy neovim PR for partial buffer update notifications...
const currentBuffer: CurrentBuffer = {
  cwd: '',
  file: '',
  contents: [],
}

const ignored: { dirs: string[] } = {
  dirs: config('workspace.ignore.dirs', m => ignored.dirs = m),
}

const filterWorkspaceSymbols = (symbols: Symbol[]): Symbol[] => {
  const excluded = ignored.dirs.map(m => path.join(vim.cwd, m))
  return symbols.filter(s => !excluded.some(dir => s.location.cwd.includes(dir)))
}

// TODO: get typings for valid requests?
const toProtocol = (data: NeovimState, more?: any) => {
  const { cwd, filetype, file, line: vimLine, column, revision } = data
  const uri = `file://${path.resolve(cwd, file)}`

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

// TODO: repurpose this function. we need one for definition, and another one for references
const asQfList = ({ uri, range }: { uri: string, range: Range }): VimQFItem => {
  const { line, column } = toVimPosition(range.start)
  const { line: endLine, column: endColumn } = toVimPosition(range.end)
  const cwd = uriAsCwd(uri)
  const file = uriAsFile(uri)
  const desc = currentBuffer.contents[line - 1] || ''
  const keyword = desc.slice(range.start.character, range.end.character)

  return { cwd, file, line, column, desc, keyword, endLine, endColumn }
}

const patchBufferCacheWithPartial = async (cwd: string, file: string, change: string, line: number): Promise<void> => {
  if (currentBuffer.cwd !== cwd && currentBuffer.file !== file)
    return console.error('trying to do a partial update before a full update has been done. normally before doing a partial update a bufEnter event happens which triggers a full update.', currentBuffer, cwd, file)
  Reflect.set(currentBuffer.contents, line - 1, change)
}

export const fullBufferUpdate = (bufferState: BufferChange) => {
  const { cwd, file, buffer: contents, filetype } = bufferState

  merge(currentBuffer, { cwd, file, contents })

  const content = { text: contents.join('\n') }
  const req = toProtocol(bufferState, { contentChanges: [ content ], filetype })

  // TODO: keeping open buffers state here seems like a bad idea...
  // shouldn't we check against vim buffer list?
  openFiles.has(cwd + file)
    ? notify.textDocument.didChange(req)
    : (openFiles.add(cwd + file), notify.textDocument.didOpen(req))
}

export const partialBufferUpdate = async (change: BufferChange) => {
  const { cwd, file, buffer, line, filetype } = change
  const syncKind = getSyncKind(cwd, filetype)

  await patchBufferCacheWithPartial(cwd, file, buffer[0], line)

  if (syncKind !== SyncKind.Incremental) return fullBufferUpdate({ ...change, buffer: currentBuffer.contents })

  const content = {
    text: buffer[0],
    range: {
      start: { line: line - 1, character: 0 },
      end: { line: line - 1, character: buffer.length - 1 }
    }
  }

  const req = toProtocol(change, { contentChanges: [ content ], filetype })

  // TODO: keeping open buffers state here seems like a bad idea...
  // shouldn't we check against vim buffer list?
  openFiles.has(cwd + file)
    ? notify.textDocument.didChange(req)
    : (openFiles.add(cwd + file), notify.textDocument.didOpen(req))
}

export const definition = async (data: NeovimState) => {
  const req = toProtocol(data)
  const result = await textDocument.definition(req)
  if (!result) return {}
  const { uri, range } = is.array(result) ? result[0] : result

  return {
    path: uriToPath(uri),
    line: range.start.line,
    column: range.start.character,
  }
}

export const references = async (data: NeovimState): Promise<VimQFItem[]> => {
  const req = toProtocol(data, {
    context: {
      includeDeclaration: true
    }
  })

  const references: Location[] = await textDocument.references(req) || []
  return references.map(asQfList)
}

export const highlights = async (data: NeovimState): Promise<VimQFItem[]> => {
  const req = toProtocol(data)
  const result = await textDocument.documentHighlight(req) as DocumentHighlight[]
  if (!result) return [] as VimQFItem[]

  return result.map(m => {
    const { line, column } = toVimPosition(m.range.start)
    const { line: endLine, column: endColumn } = toVimPosition(m.range.end)

    return {
      line,
      column,
      endLine,
      endColumn,
      cwd: data.cwd,
      file: data.file,
      desc: ''
    }
  })
}

export const rename = async (data: NeovimState & { newName: string }): Promise<Patch[]> => {
  const req = toProtocol(data, { newName: data.newName })
  const workspaceEdit = await textDocument.rename(req) as WorkspaceEdit
  return workspaceEditToPatch(workspaceEdit)
}

export const hover = async (data: NeovimState): Promise<HoverResult> => {
  const req = toProtocol(data)
  const res = await textDocument.hover(req) as Hover
  if (!res) return {}
  const { contents } = res

  if (is.string(contents)) return { value: (contents as string) }
  if (is.object(contents)) return { value: (contents as MarkedStringPart).value }
  if (is.array(contents)) return (contents as MarkedStringPart[]).reduce((obj: HoverResult, m: any, ix) => {
    if (is.object(m)) obj.value = m.value
    // i think the documentation is in the 3rd place... maybe wrong
    else if (is.string(m) && ix === 2) obj.doc = m
    return obj
  }, { value: '', doc: '' } as HoverResult)

  return {}
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

export const workspaceSymbols = async (data: NeovimState, query: string): Promise<Symbol[]> => {
  const req = { query, ...toProtocol(data) }
  const symbols = await workspace.symbol(req) as SymbolInformation[]
  if (!symbols || !symbols.length) return []
  const mappedSymbols = symbols.map(s => ({ ...s, location: toVimLocation(s.location) }))
  return filterWorkspaceSymbols(mappedSymbols)
}

export const completions = async (data: NeovimState): Promise<CompletionItem[]> => {
  const req = toProtocol(data)
  const res = await textDocument.completion(req)
  // TODO: handle isIncomplete flag in completions result
  // docs: * This list it not complete. Further typing should result in recomputing this list
  return is.object(res) && res.items ? res.items : res
}

export const completionDetail = async (data: NeovimState, item: CompletionItem): Promise<CompletionItem> => {
  const req = toProtocol(data)
  return (await completionItem.resolve({ ...req, ...item })) || {}
}

export const signatureHelp = async (data: NeovimState) => {
  const req = toProtocol(data)
  return await textDocument.signatureHelp(req) as SignatureHelp
}

export const codeLens = async (data: NeovimState): Promise<CodeLens[]> => {
  const req = toProtocol(data)
  return (await textDocument.codeLens(req)) || []
}

export const codeAction = async (data: NeovimState, diagnostics: Diagnostic[]): Promise<Command[]> => {
  const req = toProtocol(data)

  // i noticed that in vscode if there are diagnostics, then the request 'range' matches on of the
  // diagnostic entries. otherwise i'm getting cannot read property 'description' of undefined error
  // from the TS lang serv. weird
  const range = diagnostics.length
    ? { start: diagnostics[0].range.start, end: diagnostics[0].range.end }
    : { start: req.position, end: req.position }

  const request = {
    range,
    cwd: req.cwd,
    filetype: req.filetype,
    textDocument: req.textDocument,
    context: { diagnostics }
  }

  // TODO: what is causing 'cannot read description of undefined error in lsp server?'
  return (await textDocument.codeAction(request)) || []
}

export const executeCommand = async (data: NeovimState, command: Command) => {
  const req = toProtocol(data)
  workspace.executeCommand({ ...req, ...command })
}

export const applyEdit = async (edit: WorkspaceEdit) => applyPatches(workspaceEditToPatch(edit))

export { triggers }
