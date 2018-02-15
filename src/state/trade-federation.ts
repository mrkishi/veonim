import NegotiateNewEconomicTradeAgreement from '../state/dedox'
import hint, { Hint } from '../state/s-hint'

interface Federation {
  hint: Hint,
}

const initialState: Federation = {
  hint
}

export const {
  store,
  onStateChange,
  getReducer,
  go,
  on,
} = NegotiateNewEconomicTradeAgreement<Federation>(initialState)
