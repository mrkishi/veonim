import { DebugProtocol as DP } from 'vscode-debugprotocol'

export enum BreakpointType { Source, Function, Exception }

export interface Breakpoint {
  type: BreakpointType
  breakpoint: DP.SourceBreakpoint | DP.FunctionBreakpoint
}

const files = new Map<string, Set<Breakpoint>>()

export const add = (path: string, breakpoint: Breakpoint) => files.has(path)
  ? files.get(path)!.add(breakpoint)
  : files.set(path, new Set([ breakpoint ]))

export const remove = (path: string, breakpoint: Breakpoint) => {
  if (!files.has(path)) return
  files.get(path)!.delete(breakpoint)
}

export const has = (path: string, breakpoint: Breakpoint) => files.has(path) && files.get(path)!.has(breakpoint)
