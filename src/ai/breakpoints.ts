import { DebugProtocol as DP } from 'vscode-debugprotocol'

export enum BreakpointKind { Source, Function, Exception }

export interface BreakpointPosition {
  path: string
  line: number
  column: number
}

export interface Breakpoint {
  kind: BreakpointKind
  path: string
  name: string
  line: number
  column: number
  condition?: string
  functionName?: string
  hitCondition?: string
  logMessage?: string
}

const files = new Map<string, Set<Breakpoint>>()

export const add = (breakpoint: Breakpoint) => {
  return false
    // ? files.get(path)!.add(breakpoint)
    // : files.set(path, new Set([ breakpoint ]))
}

export const remove = (breakpoint: Breakpoint) => {
  // if (!files.has(path)) return
  // files.get(path)!.delete(breakpoint)
}

export const has = (position: BreakpointPosition) => {
  return true
}
