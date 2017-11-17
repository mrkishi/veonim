'use strict'
const proxyquire = require('proxyquire')
const { deepStrictEqual: eq } = require('assert')

const file = `
one
two
star wars is the best
empire strikes back is my favorite
but the best one is the HOLIDAY SPECIAL
`

const oneFilePatch = (operations) => [ { cwd: 'ayyy', file: 'lmao', operations } ]

describe('patch-fs', () => {
  let patch
  let writtenFile

  const fake = {
    readFile: () => Promise.resolve(file),
    writeFile: (path, data) => (writtenFile = data, Promise.resolve(true))
  }

  beforeEach(() => {
    writtenFile = ''
    patch = proxyquire('../../build/langserv/patch-fs', { '../utils': fake }).default
  })

  it('delete', async () => {
    const patches = oneFilePatch([
      { op: 'delete', line: 5 },
      { op: 'delete', line: 2 },
    ])

    const res = await patch(patches)

    eq(res, true)

    eq(writtenFile, `
one
star wars is the best
empire strikes back is my favorite
`
    )
  })

  it('append', async () => {
    const patches = oneFilePatch([
      { op: 'append', line: 3, val: 'LAST' },
      { op: 'append', line: 1, val: 'JEDI' },
    ])

    const res = await patch(patches)

    eq(res, true)

    eq(writtenFile, `
one
JEDI
two
star wars is the best
LAST
empire strikes back is my favorite
but the best one is the HOLIDAY SPECIAL
`
    )
  })

  it('replace', async () => {
    const patches = oneFilePatch([
      { op: 'replace', line: 5, val: 'the best one is EMPIRE STRIKES BACK' },
      { op: 'replace', line: 1, val: 'ROGUE ONE' },
    ])

    const res = await patch(patches)

    eq(res, true)

    eq(writtenFile, `
ROGUE ONE
two
star wars is the best
empire strikes back is my favorite
the best one is EMPIRE STRIKES BACK
`
    )
  })

  it('delete + append + replace', async () => {
    const patches = oneFilePatch([
      { op: 'replace', line: 5, val: 'the best one is EMPIRE STRIKES BACK' },
      { op: 'delete', line: 1 },
      { op: 'append', line: 4, val: 'in the original movies' },
    ])

    const res = await patch(patches)

    eq(res, true)

    eq(writtenFile, `
two
star wars is the best
empire strikes back is my favorite
in the original movies
the best one is EMPIRE STRIKES BACK
`
    )
  })
})
