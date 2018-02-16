import NegotiateNewEconomicTradeAgreement from '../state/dedox'
import { Hover, Actions as HoverA } from '../state/s-hover'
import { Hint, Actions as HintA } from '../state/s-hint'

export type RegisteredActions = HintA & HoverA

export interface Federation {
  hint: Hint,
  hover: Hover,
}

export const {
  store,
  onStateChange,
  getReducer,
  connect,
  go,
  on,
  getState,
} = NegotiateNewEconomicTradeAgreement<Federation>({
  hint: {},
  hover: {},
} as Federation)

on.initState((s, { part, initialState }) => Reflect.set(s, part, initialState))

export const initState = (part: string, initialState: object) => store.dispatch({
  type: 'initState',
  data: { part, initialState },
})
