import NegotiateNewEconomicTradeAgreement from '../state/dedox'
import hint, { Hint, ActionTypes as HintAT } from '../state/s-hint'
import hover, { Hover, ActionTypes as HoverAT } from '../state/s-hover'

export type RegisteredActionTypes = HintAT & HoverAT

interface Federation {
  hint: Hint,
  hover: Hover,
}

const initialState: Federation = {
  hint,
  hover,
}

export const {
  store,
  onStateChange,
  getReducer,
  go,
  on,
} = NegotiateNewEconomicTradeAgreement<Federation>(initialState)
