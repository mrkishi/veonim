export type GenericCallback = (...args: any[]) => void
export type DefineFunction = { [index: string]: (fnBody: TemplateStringsArray) => void }
export type KeyVal = { [index: string]: any }
export type StateChangeEvent = { [index: string]: (value: any) => void }

export enum VimMode {
  Normal,
  Insert,
  Visual,
  Replace,
  Operator,
  Terminal,
  CommandNormal,
  CommandInsert,
  CommandReplace,
  SomeModeThatIProbablyDontCareAbout,
}

export enum BufferType {
  Normal = '',
  Help = 'help',
  NonFile = 'nofile',
  Quickfix = 'quickfix',
  Terminal = 'terminal',
  NonWritable = 'nowrite',
  OnlyWrittenWithAutocmd = 'acwrite',
}

export enum BufferOption {
  Modifiable = 'modifiable',
  Listed = 'buflisted',
  Modified = 'modified',
  Filetype = 'filetype',
  Hidden = 'bufhidden',
  Type = 'buftype',
}

export enum BufferHide {
  Hide = 'hide',
  Unload = 'unload',
  Delete = 'delete',
  Wipe = 'wipe',
}

export enum Highlight {
  Underline = 'VeonimUnderline',
  Undercurl = 'VeonimUndercurl',
  DocumentHighlight = 'DocumentHighlight',
}

export enum HighlightGroupId {
  // as per nvim api for buf_(add|clear)highlight sourceId of 0
  // is a special number used to generate a highlight id from
  // neovim. we want to use our own, so we will skip 0
  Diagnostics = 2,
  DocumentHighlight = 3,
}

export interface HyperspaceCoordinates {
  line: number
  column?: number
  path?: string
}

type EventCallback = (state: NeovimState) => void

  // TODO: make this go bye bye
export interface NeovimState {
  buffer: Buffer
  window: Window
  tabpage: Tabpage
  absoluteFilepath: string
  bufferType: BufferType
  colorscheme: string
  filetype: string
  revision: number
  column: number
  file: string
  mode: string
  line: number
  cwd: string
  fg: string
  bg: string
  sp: string
}

export interface Event {
  bufAdd(cb: EventCallback): void
  bufLoad(cb: EventCallback): void
  bufUnload(cb: EventCallback): void
  bufChange(cb: EventCallback): void
  bufChangeInsert(cb: EventCallback): void
  bufWrite(cb: EventCallback): void
  cursorMove(cb: EventCallback): void
  cursorMoveInsert(cb: (modified: boolean, state: NeovimState) => void): void
  insertEnter(cb: EventCallback): void
  insertLeave(cb: EventCallback): void
  completion(cb: (completedWord: string, state: NeovimState) => void): void
  termEnter(cb: EventCallback): void
  termLeave(cb: EventCallback): void
}

export interface EventWait {
  bufAdd: Promise<any>
  bufLoad: Promise<any>
  bufUnload: Promise<any>
  bufChange: Promise<any>
  bufChangeInsert: Promise<any>
  bufWrite: Promise<any>
  cursorMove: Promise<any>
  cursorMoveInsert: Promise<any>
  insertEnter: Promise<any>
  insertLeave: Promise<any>
  completion: Promise<any>
  termEnter: Promise<any>
  termLeave: Promise<any>
}

export interface Color {
  background: number
  foreground: number
}

export interface ProblemHighlight {
  group: Highlight
  id: HighlightGroupId
  line: number
  columnStart: number
  columnEnd: number
}

export interface Buffer {
  id: any
  number: Promise<number>
  valid: Promise<boolean>
  name: Promise<string>
  length: Promise<number>
  changedtick: Promise<number>
  append(start: number, lines: string | string[]): void
  getLines(start: number, end: number): Promise<string[]>
  getLine(start: number): Promise<string>
  setLines(start: number, end: number, replacement: string[]): void
  delete(start: number): void
  replace(start: number, line: string): void
  getKeymap(mode: string): Promise<any>
  getVar(name: string): Promise<any>
  setVar(name: string, value: any): void
  delVar(name: string): void
  getOption(name: string): Promise<any>
  setOption(name: string, value: any): void
  setName(name: string): void
  getMark(name: string): Promise<number[]>
  addHighlight(sourceId: number, highlightGroup: string, line: number, columnStart: number, columnEnd: number): Promise<number>
  clearHighlight(sourceId: number, lineStart: number, lineEnd: number): void
  clearAllHighlights(): void
  highlightProblems(problems: ProblemHighlight[]): Promise<any[]>
}

export interface Window {
  id: any
  number: Promise<number>
  valid: Promise<boolean>
  tab: Promise<Tabpage>
  buffer: Promise<Buffer>
  cursor: Promise<number[]>
  position: Promise<number[]>
  height: Promise<number>
  width: Promise<number>
  setCursor(row: number, col: number): void
  setHeight(height: number): void
  setWidth(width: number): void
  getVar(name: string): Promise<any>
  setVar(name: string, value: any): void
  delVar(name: string): void
  getOption(name: string): Promise<any>
  setOption(name: string, value: any): void
}

export interface Tabpage {
  id: any
  number: Promise<number>
  valid: Promise<boolean>
  window: Promise<Window>
  windows: Promise<Window[]>
  getVar(name: string): Promise<any>
  setVar(name: string, value: any): void
  delVar(name: string): void
}

type AutocmdEvent = (callback: () => void) => void
type AutocmdArgEvent = (argExpression: string, callback: (arg: any) => void) => void

export interface Autocmd {
  [index: string]: AutocmdEvent & AutocmdArgEvent,
}
