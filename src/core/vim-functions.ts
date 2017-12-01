import { VimPatch } from '../langserv/patch'

export interface VimBuffer {
  name: string,
  cur: boolean,
  mod: boolean,
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
  VeonimCallEvent(event: string): void,
  Commands(): Promise<string[]>,
  Buffers(): Promise<VimBuffer[]>,
  ModifiedBuffers(): Promise<string[]>,
  OpenPaths(): Promise<string[]>,
  getcwd(): Promise<string>,
  getline(type: string | number, end?: string): Promise<string | string[]>,
  expand(type: string): Promise<string>,
  synIDattr(id: number, type: string): Promise<number>,
  getpos(where: string): Promise<WindowPosition>,
  setloclist(window: number, list: QuickFixList[]): Promise<void>,
  cursor(line: number, column: number): Promise<void>,
  PatchCurrentBuffer(patchOperations: VimPatch[]): Promise<void>,
  bufname(expr: string | number): Promise<string>,
  getbufline(expr: string | number, startLine: number, endLine?: number | string): Promise<string[]>,
  getbufvar(expr: string | number, varname?: string, defaultValue?: any): Promise<any>,
}
