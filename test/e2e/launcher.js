'use strict'

const path = require('path')
const { Application } = require('spectron')
const delay = time => new Promise(fin => setTimeout(fin, time))

module.exports = async () => {
  const projectPath = path.join(__dirname, '../data')

  const app = new Application({
    path: './node_modules/.bin/electron',
    args: [ path.join(__dirname, '../../build/bootstrap/main.js') ],
  })

  await app.start()
  await app.client.waitUntilWindowLoaded()

  const input = async m => {
    await delay(100)
    await app.client.keys(m)
  }

  input.enter = () => input('Enter')
  input.meta = async m => {
    await input('\uE03D')
    await input(m)
    await input('\uE03D')
  }

  const veonim = async cmd => {
    await input(`:Veonim ${cmd}`)
    await input.enter()
  }

  await input(`:cd ${projectPath}`)

  return { app, input, delay, veonim }
}
