'use strict'

const { $, go, run, tsc, fromRoot } = require('./runner')
const { copy, remove } = require('fs-extra')

go(async () => {
  $`cleaning build folder`
  await remove(fromRoot('build'))

  const tscMain = tsc('tsconfig.json')
  const tscWorkers = tsc('src/workers/tsconfig.json')

  await Promise.all([ tscMain, tscWorkers ])

  $`adding exports objects to web workers to work in electron context`
  await run('jscodeshift -t tools/dummy-exports.js build/workers')

  $`removing debug code from release build`
  await run('jscodeshift -t tools/remove-debug.js build')

  $`copying index.html`
  await copy(fromRoot('src/bootstrap/index.html'), fromRoot('build/bootstrap/index.html'))

  $`copying assets`
  await copy(fromRoot('src/assets'), fromRoot('build/assets'))

  $`copying runtime files`
  await copy(fromRoot('runtime'), fromRoot('build/runtime'))
})
