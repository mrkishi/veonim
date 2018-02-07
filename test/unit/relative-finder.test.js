'use strict'
const { findNext, findPrevious } = require('../../build/support/relative-finder')
const { deepStrictEqual: eq } = require('assert')

const getItems = () => [{
  path: '/main/a.ts',
  line: 1,
  col: 1,
}, {
  path: '/main/a.ts',
  line: 4,
  col: 7,
}, {
  path: '/main/a.ts',
  line: 9,
  col: 2,
}, {
  path: '/main/c.ts',
  line: 1,
  col: 7,
}, {
  path: '/main/c.ts',
  line: 3,
  col: 1,
}]

describe('relative finder', () => {
  it('find next', () => {
    const next = findNext(getItems(), '/main/a.ts', 2, 1)

    eq(next, {
      path: '/main/a.ts',
      line: 4,
      col: 7,
    })
  })

  it('find next across files', () => {
    const next = findNext(getItems(), '/main/a.ts', 9, 2)

    eq(next, {
      path: '/main/c.ts',
      line: 1,
      col: 7,
    })
  })

  it('when last loopback to first', () => {
    const next = findNext(getItems(), '/main/c.ts', 3, 1)

    eq(next, {
      path: '/main/a.ts',
      line: 1,
      col: 1,
    })
  })

  it('find previous', () => {
    const next = findPrevious(getItems(), '/main/a.ts', 2, 1)

    eq(next, {
      path: '/main/a.ts',
      line: 1,
      col: 1,
    })
  })

  it('find previous across files', () => {
    const next = findPrevious(getItems(), '/main/c.ts', 1, 7)

    eq(next, {
      path: '/main/a.ts',
      line: 9,
      col: 2,
    })
  })

  it('when first loopback to last', () => {
    const next = findPrevious(getItems(), '/main/a.ts', 1, 1)

    eq(next, {
      path: '/main/a.ts',
      line: 3,
      col: 1,
    })
  })
})
