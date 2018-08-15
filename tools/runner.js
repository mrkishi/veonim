'use strict'

const { spawn } = require('child_process')
const { join } = require('path')

const root = join(__dirname, '..')
const fromRoot = path => join(root, path)

const run = (cmd, opts = {}) => new Promise(done => {
  console.log(cmd)

  const proc = spawn('npx', cmd.split(' '), { ...opts, cwd: root, shell: true })
  const exit = () => (proc.kill(), process.exit())

  process.on('SIGBREAK', exit)
  process.on('SIGTERM', exit)
  process.on('SIGHUP', exit)
  process.on('SIGINT', exit)

  proc.stdout.pipe(process.stdout)
  proc.stderr.pipe(process.stderr)
  proc.on('exit', done)

  if (opts.outputMatch) proc.stdout.on('data', data => {
    const outputHas = data
      .toString()
      .toLowerCase()
      .includes(opts.outputMatch)

    if (outputHas && typeof opts.onOutputMatch === 'function') opts.onOutputMatch()
  })
})

const $ = (s, ...v) => Array.isArray(s) ? console.log(s.map((s, ix) => s + (v[ix] || '')).join('')) : console.log(s)
const go = fn => fn().catch(e => (console.error(e), process.exit(1)))
const createTask = () => ( (done = () => {}, promise = new Promise(m => done = m)) => ({ done, promise }) )()

module.exports = { $, go, run, root, fromRoot, createTask }
