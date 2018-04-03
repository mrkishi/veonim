'use strict'
const { findNext, findPrevious } = require('../../build/support/relative-finder')

const getItems = () => [{
  path: '/main/a.ts',
  line: 1,
  column: 1,
  endLine: 1,
  endColumn: 5,
}, {
  path: '/main/a.ts',
  line: 4,
  column: 7,
  endLine: 4,
  endColumn: 9,
}, {
  path: '/main/a.ts',
  line: 9,
  column: 2,
  endLine: 9,
  endColumn: 4,
}, {
  path: '/main/c.ts',
  line: 1,
  column: 7,
  endLine: 1,
  endColumn: 9,
}, {
  path: '/main/c.ts',
  line: 3,
  column: 1,
  endLine: 3,
  endColumn: 9,
}]

describe('relative finder', () => {
  it('find next', () => {
    const next = findNext(getItems(), '/main/a.ts', 2, 1)

    expect(next).toEqual({
      path: '/main/a.ts',
      line: 4,
      column: 7,
      endLine: 4,
      endColumn: 9,
    })
  })

  it('find next across files', () => {
    const next = findNext(getItems(), '/main/a.ts', 9, 2)

    expect(next).toEqual({
      path: '/main/c.ts',
      line: 1,
      column: 7,
      endLine: 1,
      endColumn: 9,
    })
  })

  it('when last loopback to first', () => {
    const next = findNext(getItems(), '/main/c.ts', 3, 1)

    expect(next).toEqual({
      path: '/main/a.ts',
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 5,
    })
  })

  it('find previous', () => {
    const next = findPrevious(getItems(), '/main/a.ts', 2, 1)

    expect(next).toEqual({
      path: '/main/a.ts',
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 5,
    })
  })

  it('find previous across files', () => {
    const next = findPrevious(getItems(), '/main/c.ts', 1, 7)

    expect(next).toEqual({
      path: '/main/a.ts',
      line: 9,
      column: 2,
      endLine: 9,
      endColumn: 4,
    })
  })

  it('when first loopback to last', () => {
    const next = findPrevious(getItems(), '/main/a.ts', 1, 1)

    expect(next).toEqual({
      path: '/main/c.ts',
      line: 3,
      column: 1,
      endLine: 3,
      endColumn: 9,
    })
  })

  it('find previous when in middle of current item', () => {
    const next = findPrevious(getItems(), '/main/a.ts', 4, 8)

    expect(next).toEqual({
      path: '/main/a.ts',
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 5,
    })
  })
})

