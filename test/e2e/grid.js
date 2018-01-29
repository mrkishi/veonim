'use strict'
const { deepStrictEqual: eq } = require('assert')
const { Application } = require('spectron')
const path = require('path')
const delay = time => new Promise(fin => setTimeout(fin, time))

describe('grid', function () {
  this.timeout(8000)
  let app

  const input = async m => {
    await delay(100)
    await app.client.keys(m)
  }

  const enter = async () => input('Enter')

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
      args: [path.join(__dirname, '../../build/bootstrap/main.js')]
    })
    await app.start()
    await delay(800)
  })

  it('do stuff', async () => {
    await delay(235)
    await input(':cd ~/Documents/projects/plugin-manager')
    await enter()
    await input.meta(`'`)
    await input('open')
    await enter()
    await input.meta(`'`)
    await input('attach')
    await enter()
    await input('npx tsc --watch')
    await enter()

    await app.webContents.openDevTools()
  })
})
//it('do stuff', async () => {
  //await delay(235)
  //await input(':cd ~/Documents/projects/veonim')
  //await input('Enter')
  //await input(':e src/core/canvas-container.ts')
  //await input('Enter')
  //await input(':Veonim uadd')
  //await input('Enter')

  //await app.webContents.openDevTools()
//})
