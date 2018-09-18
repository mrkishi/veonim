const { src, same } = require('../util')
const m = src('support/markdown')

describe('markdown to HTML with syntax highlighting', () => {
  it('happy path', async () => {
    const data = [
      '# STAR WARS',
      '## once upon a time in a galaxy, far far away',
      '*italic* **bold** `code`',
      '```javascript',
      'const generalKenobi = "hello there!"',
      'console.log(generalKenobi)',
      '```',
    ].join('\n')

    const res = await m.markdownToHTML("# top\n")
    same(res, '')
  })
})
