'use strict'
const { deepStrictEqual: eq } = require('assert')
const { Application } = require('spectron')
const path = require('path')
const delay = time => new Promise(fin => setTimeout(fin, time))


describe('no glitchy blargy dots fail', function () {
  this.timeout(8000)
  let app

  const input = async m => {
    await delay(100)
    await app.client.keys(m)
  }

  input.meta = async m => {
    await input('\uE03D')
    await input(m)
    await input('\uE03D')
  }

  const mode = {
    get insert() { input('i') },
    get normal() { input('Escape') },
  }

  beforeEach(async () => {
    app = new Application({
      path: './node_modules/.bin/electron',
      args: [path.join(__dirname, '../../build/main.js')]
    })
    await app.start()
    await delay(800)
  })

  after(async () => {
    await delay(3e3)
    app.stop()
  })

  it('shows initial window', async () => {
    await delay(235)
    await mode.insert
    await input('((((((((((((((((')
    await input.meta('j')
    await input('((((((((((((((((')
    await mode.normal
    await delay(235)
    await input('k')
    await input.meta('e')
    await input.meta('y')
    await input.meta('e')

    const t = await app.client.selectorExecute('#nvim', ([ el ]) => {
      return {
        height: el.height,
        width: el.width,
      }
    })

    console.log('chw', t)
  })
})
