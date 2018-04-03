const { app } = require('../../build/ui/uikit2.js')
const React = require('react')
const noop = () => {}
const h = React.createElement

describe('ui api', () => {
  let state

  beforeEach(() => {
    state = {
      name: 'luke skywalker',
      age: 22,
    }
  })

  it('create app', () => {
    const actions = { destroyDeathStar: jest.fn(), }
    const ui = app({ state, view: noop, actions })
    expect(ui).toHaveProperty('destroyDeathStar')
  })

  it('calls action on ui actionable', () => {
    const calls = []
    const actions = {
      joinTheDarkSide: (state, name) => {
        const next = { name }
        calls.push(next)
        return next
      },
    }

    const ui = app({ state, view: noop, actions })
    expect(calls[0]).toBeUndefined()
    ui.joinTheDarkSide('anakin skywalker')
    expect(calls[0]).toEqual({ name: 'anakin skywalker' })
    expect(state.name).toEqual('luke skywalker')
  })

  it('renders view', () => {
    const calls = []
    const actions = { joinTheDarkSide: (state, name) => ({ name }), }
    const view = jest.fn((state, actions) => h('div', {}, ...[
      h('span', {}, state.name),
      h('button', { onClick: actions.joinTheDarkSide }, state.age),
    ]))

    const ui = app({ state, view, actions })
    expect(view.mock.calls[0]).toEqual([{ age: 22, name: 'luke skywalker' }, actions])
    ui.joinTheDarkSide('darth maul')
    expect(view.mock.calls[1]).toEqual([{ age: 22, name: 'darth maul' }, actions])
  })
})
