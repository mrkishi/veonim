import NegotiateNewEconomicTradeAgreement from '../state/dedox'

interface Federation {
  hint: {
    label: string,
    visible: boolean,
    row: number,
    col: number,
  }
}

export default NegotiateNewEconomicTradeAgreement<Federation>({
  hint: {
    label: '',
    visible: false,
    row: 0,
    col: 0,
  }
})

// onStateChange(s => console.log(s))

// on.blarg((state, data) => state.pets.push(data))

// go.blarg('nice')
// go.blarg('ayyy')
