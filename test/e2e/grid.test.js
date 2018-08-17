'use strict'
const { deepStrictEqual: eq } = require('assert')
const { Application } = require('spectron')
const path = require('path')
const delay = time => new Promise(fin => setTimeout(fin, time))

describe('grid', function () {
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

  const printLogs = () => {
    console.log(...app.client.getMainProcessLogs())
    console.log(...app.client.getRenderProcessLogs())
  }

  beforeEach(async () => {
    app = new Application({
      path: './node_modules/.bin/electron',
      args: [ path.join(__dirname, '../../build/bootstrap/main.js') ],
    })
    await app.start()
    await app.client.waitUntilWindowLoaded()
  })

  it('do stuff', async () => {
    await input(':cd ~/Documents/projects/plugin-manager')
    await enter()
    await input(':Veonim TermOpen')
    await enter()
    await input(':Veonim TermAttach')
  })
})
// TODO: define a way to select tests from command line and/or veonim
//it('do stuff', async () => {
  //await delay(235)
  //await input(':cd ~/Documents/projects/veonim')
  //await input('Enter')
  //await input(':e src/core/canvas-container.ts')
  //await input('Enter')
  //await input(':Veonim uadd')
  //await input('Enter')

// await input.meta('e')
// const t = await app.client.selectorExecute('#nvim', ([ el ]) => {
//   return {
//     height: el.height,
//     width: el.width,
//   }
// })
  //await app.webContents.openDevTools()
//})
