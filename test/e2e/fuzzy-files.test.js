'use strict'

const { deepStrictEqual: eq } = require('assert')
const launch = require('./launcher')
const { delay } = require('../util')

describe('fuzzy files', () => {
  let m

  before(async () => m = await launch())
  after(() => m.stop())

  it('do the needful', async () => {
    await m.veonimAction('files')
    const diffAmount = await m.snapshotTest('files')
    eq(diffAmount < 1, true, `files image snapshot is different by ${diffAmount}% (diff of <1% is ok)`)
    await m.input.esc()
  })

  it('explorer', async () => {
    await m.veonimAction('explorer')
    const diffAmount = await m.snapshotTest('explorer')
    eq(diffAmount < 1, true, `explorer image snapshot is different by ${diffAmount}% (diff of <1% is ok)`)
    await m.input.esc()
  })
})
