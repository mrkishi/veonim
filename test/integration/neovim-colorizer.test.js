const { src, same } = require('../util')
const EventEmitter = require('events')
const childProcess = require('child_process')

const watchers = new EventEmitter()

global.onmessage = () => {}
global.postMessage = ([ ev, args, id ]) => watchers.emit(id, args)

src('workers/neovim-colorizer', {
  'child_process': {
    ...childProcess,
    spawn: (...args) => {
      console.log('PROXYING SPAWN LOL')
      return childProcess.spawn(...args)
    }
  }
})

let id = 1

const request = (method, ...data) => new Promise(done => {
  const reqId = id++
  global.onmessage({ data: [ method, data, reqId ] })
  watchers.once(reqId, done)
})

describe('markdown to HTML with syntax highlighting', () => {
  it('happy path', async () => {
    const markdown = [
      '# STAR WARS',
      '## ESB',
      '*italic* **bold** `code`',
      '```javascript',
      'const generalKenobi = "hello there!"',
      'console.log(generalKenobi)',
      '```',
    ].join('\n')

    const res = await request('colorizeMarkdownToHTML', markdown)

    const expected = [
      '<h1 id="star-wars">STAR WARS</h1>',
      '<h2 id="esb">ESB</h2>',
      '<p><em>italic</em> <strong>bold</strong> <code>code</code></p>',
      '<pre><code class="language-javascript"><span>const generalKenobi = "hello there!"</span><span>console.log(generalKenobi)</span></code></pre>',
      '',
    ].join('\n')

    same(res, expected)
  })
})
