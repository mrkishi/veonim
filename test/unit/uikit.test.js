const { app } = require('../../build/ui/uikit2.js')

describe('ui api', () => {
  let state
  let view
  let actions

  beforeEach(() => {
    view = jest.fn()

    state = {
      name: 'luke skywalker',
      age: 22,
    }

    actions = {
      destroyDeathStar: jest.fn(),
    }
  })

  it('create app', () => {
    const ui = app({ state, view, actions })
    expect(ui).toHaveProperty('destroyDeathStar')
  })

  it('calls action on ui actionable', () => {
    const calls = []
    const acts = {
      ...actions,
      joinTheDarkSide: (state, name) => {
        const next = { name }
        calls.push(next)
        return next
      },
    }

    const ui = app({ state, view, actions: acts })
    expect(calls[0]).toBeUndefined()
    ui.joinTheDarkSide('anakin skywalker')
    expect(calls[0]).toEqual({ name: 'anakin skywalker' })
  })

})
