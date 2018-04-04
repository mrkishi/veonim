const { app } = require('../../build/ui/uikit2.js')
const React = require('react')
const noop = () => {}
const h = React.createElement

describe('ui api', () => {
  let state
  let element

  beforeEach(() => {
    element = document.createElement('div')
    document.body.appendChild(element)

    state = {
      name: 'luke skywalker',
      age: 22,
    }
  })

  it('create app', () => {
    const actions = { destroyDeathStar: jest.fn(), }
    const ui = app({ state, view: noop, actions, element })
    expect(ui).toHaveProperty('destroyDeathStar')
  })

  it('calls action on ui actionable', () => {
    const actions = {
      joinTheDarkSide: jest.fn((state, name) => ({ name })),
    }

    const { calls } = actions.joinTheDarkSide.mock
    const ui = app({ state, view: noop, actions, element })

    ui.joinTheDarkSide('anakin skywalker')
    expect(calls[0][0]).toEqual({ age: 22, name: 'luke skywalker' })
    expect(calls[0][1]).toEqual('anakin skywalker')
    expect(state.name).toEqual('luke skywalker')
  })

  it('renders view', () => {
    const actions = {
      joinTheDarkSide: (state, name) => ({ name }),
    }

    const view = jest.fn((state, actions) => h('div', {}, ...[
      h('span', {}, state.name),
      h('button', { onClick: actions.joinTheDarkSide }, state.age),
    ]))

    const { calls } = view.mock
    const ui = app({ state, view, actions, element })

    expect(calls[0][0]).toEqual({ age: 22, name: 'luke skywalker' })
    ui.joinTheDarkSide('darth maul')
    expect(calls[1][0]).toEqual({ age: 22, name: 'darth maul' })
  })

  it('calls action from view and renders update', () => {
    const actions = {
      joinTheDarkSide: jest.fn((state, name) => ({ name })),
    }

    const view = jest.fn((state, actions) => h('div', {}, ...[
      h('button', {
        id: 'rogue1',
        onClick: () => actions.joinTheDarkSide('count dooku'),
      }, state.name),
    ]))


    const { calls } = view.mock
    const ui = app({ state, view, actions, element })

    document.getElementById('rogue1').click()

    expect(calls[0][0]).toEqual({ age: 22, name: 'luke skywalker' })
    expect(calls[1][0]).toEqual({ age: 22, name: 'count dooku' })
    expect(state.name).toEqual('luke skywalker')
  })
})
