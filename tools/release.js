'use strict'

const { $, go, run, fromRoot } = require('./runner')
const { build } = require('electron-builder')
const { copy, remove } = require('fs-extra')

const config = {
  productName: 'veonim',
  appId: 'com.veonim.veonim',
  directories: {
    buildResources: 'art'
  },
  files: [
    'build/**',
    '!**/*.map'
  ],
  mac: {
    target: ['dmg', 'zip'],
  },
  linux: {
    target: ['appimage', 'zip'],
  },
  win: {
    target: ['exe', 'zip'],
  },
  asar: false,
  publish: false,
}

go(async () => {
  $`cleaning dist (release) folder`
  await remove(fromRoot('dist'))

  $`building veonim for operating system: ${process.platform}`
  await build({ config }).catch(console.error)
})
