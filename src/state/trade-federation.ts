import NegotiateNewEconomicTradeAgreement from '../state/dedox'
import { Hint, ActionTypes as HintAT } from '../state/s-hint'
import { Hover, ActionTypes as HoverAT } from '../state/s-hover'

export type RegisteredActionTypes = HintAT & HoverAT

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
} = NegotiateNewEconomicTradeAgreement<Federation>({
  hint: {},
  hover: {},
} as Federation)

on.initState((s, { part, initialState }) => Reflect.set(s, part, initialState))

export const initState = (part: string, initialState: object) => store.dispatch({
  type: 'initState',
  data: { part, initialState },
})
