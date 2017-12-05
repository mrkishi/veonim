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

const oneFilePatch = (operations) => [ {
  cwd: 'ayyy',
  file: 'lmao',
  path: 'ayyy/lmao',
  operations
} ]

describe('patch-fs', () => {
  let patch
  let writtenFile

  const fake = {
    readFile: () => Promise.resolve(file),
    writeFile: (path, data) => (writtenFile = data, Promise.resolve(true))
  }

  beforeEach(() => {
    writtenFile = ''
    patch = proxyquire('../../build/langserv/patch-fs', { '../support/utils': fake }).default
  })

  it('delete', async () => {
    const patches = oneFilePatch([
      { op: 'delete', start: { line: 2, character: 0 }, end: { line: 2, character: 0 } },
      { op: 'delete', start: { line: 5, character: 0 }, end: { line: 5, character: 0 } },
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
    const patches = oneFilePatch([{
      op: 'append',
      start: { line: 1, character: 0 },
      end: { line: 1, character: 0 },
      val: 'JEDI'
    }, {
      op: 'append',
      start: { line: 3, character: 0 },
      end: { line: 3, character: 0 },
      val: 'LAST'
    }])

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
    const patches = oneFilePatch([{
      op: 'replace',
      start: { line: 5, character: 20 },
      end: { line: 5, character: 39 },
      val: 'EMPIRE STRIKES BACK'
    }, {
      op: 'replace',
      start: { line: 1, character: 0 },
      end: { line: 1, character: 3 },
      val: 'ROGUE ONE'
    }])

    const res = await patch(patches)

    eq(res, true)

    eq(writtenFile, `
ROGUE ONE
two
star wars is the best
empire strikes back is my favorite
but the best one is EMPIRE STRIKES BACK
`
    )
  })

  it('delete + append + replace', async () => {
    const patches = oneFilePatch([{
      op: 'replace',
      start: { line: 5, character: 20 },
      end: { line: 5, character: 39 },
      val: 'EMPIRE STRIKES BACK'
    }, {
      op: 'delete',
      start: { line: 1, character: 0 },
      end: { line: 1, character: 0 },
    }, {
      op: 'append',
      start: { line: 4, character: 0 },
      end: { line: 4, character: 0 },
      val: 'in the original movies'
    }])

    const res = await patch(patches)

    eq(res, true)

    eq(writtenFile, `
two
star wars is the best
empire strikes back is my favorite
in the original movies
but the best one is EMPIRE STRIKES BACK
`
    )
  })
})
