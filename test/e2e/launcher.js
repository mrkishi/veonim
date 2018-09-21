'use strict'

const path = require('path')
const { Application } = require('spectron')
const { delay } = require('../util')
const fs = require('fs-extra')

module.exports = async () => {
  const projectPath = path.join(__dirname, '../data')
  const resultsPath = path.join(__dirname, '../../results')
  fs.ensureDir(resultsPath)

  const app = new Application({
    path: './node_modules/.bin/electron',
    args: [ path.join(__dirname, '../../build/bootstrap/main.js') ],
  })

  await app.start()
  await app.client.waitUntilWindowLoaded()
  await delay(500)

  const input = async m => {
    await delay(100)
    await app.client.keys(m)
  }

  input.enter = () => input('Enter')
  input.esc = () => input('Escape')

  input.meta = async m => {
    await input('\uE03D')
    await input(m)
    await input('\uE03D')
  }

  const veonim = async cmd => {
    await input(`:Veonim ${cmd}`)
    await input.enter()
  }

  const screencap = async name => {
    await delay(200)
    const imageBuf = await app.browserWindow.capturePage().catch(console.error)
    if (!imageBuf) return console.error(`faild to screencap "${name}"`)
    const location = path.join(resultsPath, `${name}.png`)
    fs.writeFile(location, imageBuf)
  }

  await input(`:cd ${projectPath}`)
  await input.enter()

  return { app, input, veonim, screencap }
}
