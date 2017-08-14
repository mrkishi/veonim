// AUTO-GENERATED! This file automagically generated with gen-api.js
// Neovim version: 0.2.0

export interface ExtContainer {
  extContainer: boolean,
  kind: number,
  id: any,
}

export interface Api {
  uiAttach(width: number, height: number, options: object): void,
  uiDetach(): void,
  uiTryResize(width: number, height: number): void,
  uiSetOption(name: string, value: any): void,
  command(command: string): void,
  feedkeys(keys: string, mode: string, escape_csi: boolean): void,
  input(keys: string): Promise<number>,
  replaceTermcodes(str: string, from_part: boolean, do_lt: boolean, special: boolean): Promise<string>,
  commandOutput(str: string): Promise<string>,
  eval(expr: string): Promise<any>,
  callFunction(fname: string, args: any[]): Promise<any>,
  strwidth(str: string): Promise<number>,
  listRuntimePaths(): Promise<string[]>,
  setCurrentDir(dir: string): void,
  getCurrentLine(): Promise<string>,
  setCurrentLine(line: string): void,
  delCurrentLine(): void,
  getVar(name: string): Promise<any>,
  setVar(name: string, value: any): void,
  delVar(name: string): void,
  getVvar(name: string): Promise<any>,
  getOption(name: string): Promise<any>,
  setOption(name: string, value: any): void,
  outWrite(str: string): void,
  errWrite(str: string): void,
  errWriteln(str: string): void,
  listBufs(): Promise<ExtContainer[]>,
  getCurrentBuf(): Promise<ExtContainer>,
  setCurrentBuf(buffer: Buffer): void,
  listWins(): Promise<ExtContainer[]>,
  getCurrentWin(): Promise<ExtContainer>,
  setCurrentWin(window: Window): void,
  listTabpages(): Promise<ExtContainer[]>,
  getCurrentTabpage(): Promise<ExtContainer>,
  setCurrentTabpage(tabpage: Tabpage): void,
  subscribe(event: string): void,
  unsubscribe(event: string): void,
  getColorByName(name: string): Promise<number>,
  getColorMap(): Promise<any>,
  getMode(): Promise<any>,
  getApiInfo(): Promise<any[]>,
  callAtomic(calls: any[]): Promise<any[]>,
  buffer: Buffer,
  window: Window,
  tabpage: Tabpage,
}

export interface Buffer {
  lineCount(buffer: Buffer): Promise<number>,
  getLines(buffer: Buffer, start: number, end: number, strict_indexing: boolean): Promise<string[]>,
  setLines(buffer: Buffer, start: number, end: number, strict_indexing: boolean, replacement: string[]): void,
  getVar(buffer: Buffer, name: string): Promise<any>,
  getChangedtick(buffer: Buffer): Promise<number>,
  setVar(buffer: Buffer, name: string, value: any): void,
  delVar(buffer: Buffer, name: string): void,
  getOption(buffer: Buffer, name: string): Promise<any>,
  setOption(buffer: Buffer, name: string, value: any): void,
  getNumber(buffer: Buffer): Promise<number>,
  getName(buffer: Buffer): Promise<string>,
  setName(buffer: Buffer, name: string): void,
  isValid(buffer: Buffer): Promise<boolean>,
  getMark(buffer: Buffer, name: string): Promise<number[]>,
  addHighlight(buffer: Buffer, src_id: number, hl_group: string, line: number, col_start: number, col_end: number): Promise<number>,
  clearHighlight(buffer: Buffer, src_id: number, line_start: number, line_end: number): void,
}

export interface Window {
  getBuf(window: Window): Promise<ExtContainer>,
  getCursor(window: Window): Promise<number[]>,
  setCursor(window: Window, pos: number[]): void,
  getHeight(window: Window): Promise<number>,
  setHeight(window: Window, height: number): void,
  getWidth(window: Window): Promise<number>,
  setWidth(window: Window, width: number): void,
  getVar(window: Window, name: string): Promise<any>,
  setVar(window: Window, name: string, value: any): void,
  delVar(window: Window, name: string): void,
  getOption(window: Window, name: string): Promise<any>,
  setOption(window: Window, name: string, value: any): void,
  getPosition(window: Window): Promise<number[]>,
  getTabpage(window: Window): Promise<ExtContainer>,
  getNumber(window: Window): Promise<number>,
  isValid(window: Window): Promise<boolean>,
}

export interface Tabpage {
  listWins(tabpage: Tabpage): Promise<ExtContainer[]>,
  getVar(tabpage: Tabpage, name: string): Promise<any>,
  setVar(tabpage: Tabpage, name: string, value: any): void,
  delVar(tabpage: Tabpage, name: string): void,
  getWin(tabpage: Tabpage): Promise<ExtContainer>,
  getNumber(tabpage: Tabpage): Promise<number>,
  isValid(tabpage: Tabpage): Promise<boolean>,
}

export const Prefixes = {
  Core: 'nvim_' ,
  Buffer: 'nvim_buf_',
  Window: 'nvim_win_',
  Tabpage: 'nvim_tabpage_',
}

export enum ExtType {
  Buffer,
  Window,
  Tabpage,
}
