import { Position, TextEdit, WorkspaceEdit } from 'vscode-languageserver-types'
import { uriAsCwd, uriAsFile } from '../support/utils'
import { join } from 'path'

const samePos = (s: Position, e: Position) => s.line === e.line && s.character === e.character

enum Operation {
  Delete = 'delete',
  Append = 'append',
  Replace = 'replace',
}

interface PatchOperation {
  op: Operation,
  val: string,
  start: Position,
  end: Position,
}

export interface Patch {
  cwd: string,
  file: string,
  path: string,
  operations: PatchOperation[],
}

const asOperation = (edit: TextEdit): PatchOperation => {
  const { newText: val, range: { start, end } } = edit
  const meta = { val, start, end }

  if (!val) return { ...meta, op: Operation.Delete }
  if (samePos(start, end)) return { ...meta, op: Operation.Append }
  return { ...meta, op: Operation.Replace }
}

const asPatch = (uri: string, edits: TextEdit[]): Patch => {
  const cwd = uriAsCwd(uri)
  const file = uriAsFile(uri)
  return {
    cwd,
    file,
    path: join(cwd, file),
    operations: edits.map(asOperation),
  }
}

export const workspaceEditToPatch = ({ changes = {}, documentChanges }: WorkspaceEdit): Patch[] => documentChanges
  ? documentChanges.map(({ textDocument, edits }) => asPatch(textDocument.uri, edits))
  : Object.entries(changes).map(([ file, edits ]) => asPatch(file, edits))
