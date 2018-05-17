const { src, same } = require('./util')
const m = src('support/colorize-with-highlight').default

describe('colorize with highlight', () => {
  it('highlight same word as hlgroup word - no change to colorData structure', () => {
    const input = {
      line: `const blarg = require('module')`,
      start: {
        line: 0,
        column: 6,
      },
      end: {
        line: 0,
        column: 10,
      },
      colorizedLine: [
        { color: 'a', text: 'const' },
        { color: 'c', text: ' ' },
        { color: 'b', text: 'blarg' },
        { color: 'c', text: ' = ' },
        { color: 'a', text: 'require' },
        { color: 'c', text: `('` },
        { color: 'd', text: 'module' },
        { color: 'c', text: `')` },
      ],
    }

    const res = m(input, 'fancyColor')

    const expected = {
      line: `const blarg = require('module')`,
      start: {
        line: 0,
        column: 6,
      },
      end: {
        line: 0,
        column: 10,
      },
      colorizedLine: [
        { color: 'a', text: 'const' },
        { color: 'c', text: ' ' },
        { color: 'fancyColor', text: 'blarg' },
        { color: 'c', text: ' = ' },
        { color: 'a', text: 'require' },
        { color: 'c', text: `('` },
        { color: 'd', text: 'module' },
        { color: 'c', text: `')` },
      ],
    }

    same(res, expected)
  })

  it('highlight across different highlight groups - colorData structure modified', () => {
    const input = {
      line: `const blarg = require('module')`,
      start: {
        line: 0,
        column: 2,
      },
      end: {
        line: 0,
        column: 10,
      },
      colorizedLine: [
        { color: 'a', text: 'const' },
        { color: 'c', text: ' ' },
        { color: 'b', text: 'blarg' },
        { color: 'c', text: ' = ' },
        { color: 'a', text: 'require' },
        { color: 'c', text: `('` },
        { color: 'd', text: 'module' },
        { color: 'c', text: `')` },
      ],
    }

    const res = m(input, 'fancyColor')

    const expected = {
      line: `const blarg = require('module')`,
      start: {
        line: 0,
        column: 6,
      },
      end: {
        line: 0,
        column: 10,
      },
      colorizedLine: [
        { color: 'a', text: 'co' },
        { color: 'fancyColor', text: 'nst blarg' },
        { color: 'c', text: ' = ' },
        { color: 'a', text: 'require' },
        { color: 'c', text: `('` },
        { color: 'd', text: 'module' },
        { color: 'c', text: `')` },
      ],
    }

    same(res, expected)
  })
})
