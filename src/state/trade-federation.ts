import { BufferSearch, Actions as BufferSearchA } from '../state/buffer-search'
import { ProblemInfo, Actions as ProblemInfoA } from '../state/problem-info'
import { CommandLine, Actions as CommandLineA } from '../state/command-line'
import { Hover, Actions as HoverA } from '../state/hover'
import { Hint, Actions as HintA } from '../state/hint'
import LOL from '../state/dedox'

export type RegisteredActions = HintA
  & HoverA
  & ProblemInfoA
  & CommandLineA
  & BufferSearchA

export interface Federation {
  hint: Hint,
  hover: Hover,
  problemInfo: ProblemInfo,
  commandLine: CommandLine,
  bufferSearch: BufferSearch,
}

export const {
  store,
  onStateChange,
  getReducer,
  connect,
  go,
  on,
  getState,
} = LOL<Federation>({
  hint: {},
  hover: {},
  problemInfo: {},
  commandLine: {},
  bufferSearch: {},
} as Federation)

on.initState((s, { part, initialState }) => Reflect.set(s, part, initialState))

export const initState = (part: string, initialState: object) => store.dispatch({
  type: 'initState',
  data: { part, initialState },
})
