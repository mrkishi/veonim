'use strict'

const { deepStrictEqual: eq } = require('assert')
const launch = require('./launcher')
const { delay } = require('../util')

describe('fuzzy files', () => {
  let app, input, veonim

  before(async () => {
    const m = await launch()
    app = m.app
    input = m.input
    veonim = m.veonim
  })

  after(async () => {
    app.stop()
  })

  it('do the needful', async () => {
    await veonim('files')
    await delay(2e3)
    await input.esc()
  })

  it('explorer', async () => {
    await veonim('explorer')
    await delay(2e3)
    await input.esc()
  })
})
