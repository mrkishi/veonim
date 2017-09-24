import { PatchOperation } from './langserv/adapter'

export interface VimBuffer {
  name: string,
  cur: boolean,
  mod: boolean
}

export interface QuickFixList {
  text: string,
  lnum: number,
  col: number,
  vcol?: number,
  pattern?: string,
  nr?: number,
  bufnr?: number,
  filename?: string,
  type?: string,
}

type WindowPosition = [ string, number, number, number ]

export interface Functions {
  Commands(): Promise<string[]>,
  Buffers(): VimBuffer[],
  OpenPaths(): Promise<string[]>,
  getcwd(): Promise<string>,
  getline(type: string | number, end?: string): Promise<string | string[]>,
  expand(type: string): string,
  synIDattr(id: number, type: string): Promise<number>,
  getpos(where: string): Promise<WindowPosition>,
  setloclist(window: number, list: QuickFixList[]): Promise<void>,
  cursor(line: number, column: number): Promise<void>,
  PatchCurrentBuffer(patchOperations: PatchOperation[]): Promise<void>,
}
