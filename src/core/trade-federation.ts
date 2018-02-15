import NegotiateNewEconomicTradeAgreement from '../support/dedox'

interface Federation {
  hint: {
    label: string,
    visible: boolean,
    row: number,
    col: number,
  }
}

const federation = NegotiateNewEconomicTradeAgreement()

// onStateChange(s => console.log(s))

// on.blarg((state, data) => state.pets.push(data))

// go.blarg('nice')
// go.blarg('ayyy')
