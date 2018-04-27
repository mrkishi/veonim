// TODO: todo not being used... lame

'use strict'

const { spawn } = require('child_process')
const path = require('path')

const main = async () => {
  const tscMain = tsc('tsconfig.json')
  const tscWorkers = tsc('src/workers/tsconfig.json')

  await Promise.all([ tscMain, tscWorkers ])

  await run('jscodeshift', ['-t', 'tools/dummy-exports.js', 'build/workers'])
  await run('jscodeshift', ['-t', 'tools/remove-debug.js', 'build'])
}

const run = (cmd, args) => new Promise(done => {
  const proc = spawn(cmd, args, {
    shell: true,
    stdio: 'inherit',
    cwd: path.join(-_dirname, '..')
  })

  process.on('SIGTERM', () => proc.kill('SIGTERM'))
  process.on('SIGINT', () => proc.kill('SIGINT'))
  process.on('SIGBREAK', () => proc.kill('SIGBREAK'))
  process.on('SIGHUP', () => proc.kill('SIGHUP'))
  proc.on('exit', done)
})

const tsc = confPath => run('tsc', ['-p', conf])

main().catch(err => {
  console.error(err)
  process.exit(1)
})
