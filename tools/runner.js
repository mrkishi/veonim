'use strict'

const { spawn } = require('child_process')
const { join } = require('path')

const root = join(__dirname, '..')
const fromRoot = path => join(root, path)

const run = cmd => new Promise(done => {
  console.log(cmd)

  const proc = spawn('npx', cmd.split(' '), {
    stdio: 'inherit',
    shell: true,
    cwd: root,
  })

  process.on('SIGBREAK', () => proc.kill('SIGBREAK'))
  process.on('SIGTERM', () => proc.kill('SIGTERM'))
  process.on('SIGHUP', () => proc.kill('SIGHUP'))
  process.on('SIGINT', () => proc.kill('SIGINT'))

  proc.on('exit', done)
})

const tsc = confPath => run(`tsc -p ${confPath}`)
const $ = (s, ...v) => Array.isArray(s) ? console.log(s.map((s, ix) => s + (v[ix] || '')).join('')) : console.log(s)
const go = fn => fn().catch(e => (console.error(err), process.exit(1)))

module.exports = { $, go, run, tsc, root, fromRoot }
