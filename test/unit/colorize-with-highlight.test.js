const { src, same } = require('./util')
const m = src('support/colorize-with-highlight').default

describe('colorize with highlight', () => {
  it('highlight same word as hlgroup word - no change to colorData structure', () => {
    const input = {
      line: `let a = f(mo)`,
      start: {
        line: 0,
        column: 4,
      },
      end: {
        line: 0,
        column: 4,
      },
      colorizedLine: [
        { color: 'a', text: 'l' },
        { color: 'a', text: 'e' },
        { color: 'a', text: 't' },
        { color: '', text: ' ' },
        { color: 'c', text: 'a' },
        { color: '', text: ' ' },
        { color: 'b', text: '=' },
        { color: '', text: ' ' },
        { color: 'c', text: 'f' },
        { color: 'b', text: '(' },
        { color: 'c', text: 'm' },
        { color: 'c', text: 'o' },
        { color: 'b', text: ')' },
      ],
    }

    const res = m(input, 'fancyColor')

    const expected = [
      { color: 'a', text: 'let' },
      { color: '', text: ' ' },
      { color: 'fancyColor', text: 'a' },
      { color: '', text: ' ' },
      { color: 'b', text: '=' },
      { color: '', text: ' ' },
      { color: 'c', text: 'f' },
      { color: 'b', text: `(` },
      { color: 'c', text: 'mo' },
      { color: 'b', text: `)` },
    ]

    same(res, expected)
  })

  it('highlight across different highlight groups - colorData structure modified', () => {
    const input = {
      line: 'let a = f(mo)',
      start: {
        line: 0,
        column: 1,
      },
      end: {
        line: 0,
        column: 4,
      },
      colorizedLine: [
        { color: 'a', text: 'l' },
        { color: 'a', text: 'e' },
        { color: 'a', text: 't' },
        { color: '', text: ' ' },
        { color: 'c', text: 'a' },
        { color: '', text: ' ' },
        { color: 'b', text: '=' },
        { color: '', text: ' ' },
        { color: 'c', text: 'f' },
        { color: 'b', text: '(' },
        { color: 'c', text: 'm' },
        { color: 'c', text: 'o' },
        { color: 'b', text: ')' },
      ],
    }

    const res = m(input, 'fancyColor')

    const expected = [
      { color: 'a', text: 'l' },
      { color: 'fancyColor', text: 'et a' },
      { color: '', text: ' ' },
      { color: 'b', text: '=' },
      { color: '', text: ' ' },
      { color: 'c', text: 'f' },
      { color: 'b', text: `(` },
      { color: 'c', text: 'mo' },
      { color: 'b', text: `)` },
      ]

    same(res, expected)
  })
})
