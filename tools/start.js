'use strict'

const { $, go, run, fromRoot, createTask } = require('./runner')
const { copy, codemod, paths } = require('./build')
const fs = require('fs-extra')

const devConfig = fromRoot('xdg_config')
const tscOpts = { resolveWhenOutputHas: 'compilation complete' }

go(async () => {
  await fs.ensureDir(devConfig)

  await Promise.all([
    copy.index(),
    copy.assets(),
    copy.runtime(),
  ])

  $`========================================`
  $`local dev XDG_CONFIG_HOME dir: ${devConfig}`
  $`----------------------------------------`
  $`for the purposes of development/testing pretend this is your ~/.config or XDG_CONFIG_HOME equivalent folder. in dev mode, veonim will use this folder to source configs and install extensions/plugins to`
  $`========================================`

  const tsc = { main: createTask(), workers: createTask() }

  run('tsc -p tsconfig.json --watch --preserveWatchOutput', {
    outputMatch: 'compilation complete',
    onOutputMatch: tsc.main.done,
  })

  run('tsc -p src/workers/tsconfig.json --watch --preserveWatchOutput', {
    outputMatch: 'compilation complete',
    onOutputMatch: () => codemod.workerExports().then(tsc.workers.done),
  })

  await Promise.all([ tsc.main.promise, tsc.workers.promise ])

  $`starting electron`
  run('electron build/bootstrap/main.js', {
    env: {
      ...process.env,
      VEONIM_DEV: 42,
      XDG_CONFIG_HOME: devConfig,
    }
  })

  $`watching index.html for changes...`
  fs.watch(fromRoot(paths.index), copy.index)
})
