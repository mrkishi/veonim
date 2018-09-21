'use strict'

const { deepStrictEqual: eq } = require('assert')
const launch = require('./launcher')

describe('fuzzy files', () => {
  it('do the needful', async () => {
    const { app, input, veonim } = await launch()
    await veonim('files')
  })
})
