'use strict'

const { $, go, run, fromRoot } = require('./runner')
const { copy, remove, ensureDir } = require('fs-extra')
const { build } = require('electron-builder')
const { deps } = require('./postinstall')

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
    files: [{
      from: 'bindeps/node_modules',
      to: 'node_modules'
    }]
  },
  linux: {
    target: ['appimage', 'zip'],
    files: [{
      from: 'bindeps/node_modules',
      to: 'node_modules'
    }]
  },
  win: {
    target: ['portable', 'zip'],
    files: [{
      from: 'bindeps/node_modules',
      to: 'node_modules'
    }]
  },
  asar: false,
  publish: false,
}

go(async () => {
  $`cleaning dist (release) folder`
  await remove(fromRoot('dist'))

  $`installing binary dependencies for dist`
  await ensureDir(fromRoot('bindeps'))

  for (const [ dependency, version ] of Object.entries(deps)) {
    await run(`npm i ${dependency}@${version} --force --no-save --prefix ./bindeps`)
  }

  $`building veonim for operating system: ${process.platform}`
  await build({ config }).catch(console.error)

  await remove(fromRoot('bindeps'))
  $`fin dist pack`
})
