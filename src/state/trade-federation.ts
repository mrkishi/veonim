import { ProblemInfo, Actions as ProblemInfoA } from '../state/problem-info'
import { ColorPicker, Actions as ColorPickerA } from '../state/color-picker'
import { Hover, Actions as HoverA } from '../state/hover'
import { Hint, Actions as HintA } from '../state/hint'
import LOL from '../state/dedox'

export type RegisteredActions = HintA & HoverA & ProblemInfoA & ColorPickerA

export interface Federation {
  hint: Hint,
  hover: Hover,
  problemInfo: ProblemInfo,
  colorPicker: ColorPicker,
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
  colorPicker: {},
} as Federation)

on.initState((s, { part, initialState }) => Reflect.set(s, part, initialState))

export const initState = (part: string, initialState: object) => store.dispatch({
  type: 'initState',
  data: { part, initialState },
})
