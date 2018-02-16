import { ProblemInfo, Actions as ProblemInfoA } from '../state/s-problem-info'
import { Hover, Actions as HoverA } from '../state/s-hover'
import { Hint, Actions as HintA } from '../state/s-hint'
import LOL from '../state/dedox'

export type RegisteredActions = HintA & HoverA & ProblemInfoA

export interface Federation {
  hint: Hint,
  hover: Hover,
  problemInfo: ProblemInfo,
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
} as Federation)

on.initState((s, { part, initialState }) => Reflect.set(s, part, initialState))

export const initState = (part: string, initialState: object) => store.dispatch({
  type: 'initState',
  data: { part, initialState },
})
