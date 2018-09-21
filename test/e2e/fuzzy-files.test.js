'use strict'

const { deepStrictEqual: eq } = require('assert')
const launch = require('./launcher')
const { delay } = require('../util')

describe('fuzzy files', () => {
  let app, input, veonim, screencap

  before(async () => {
    const m = await launch()
    app = m.app
    input = m.input
    veonim = m.veonim
    screencap = m.screencap
  })

  after(async () => {
    app.stop()
  })

  it('do the needful', async () => {
    await veonim('files')
    await screencap('files')
    await input.esc()
  })

  it('explorer', async () => {
    await veonim('explorer')
    await screencap('explorer')
    await input.esc()
  })
})
