'use strict'

const { NewlineSplitter } = require('./build/utils')
const Ripgrep = require('@veonim/ripgrep').default
const rg = Ripgrep(['const', '--vimgrep'], { cwd: '/Users/a/Documents/projects/veonim' })

rg.stdout.pipe(NewlineSplitter()).on('data', m => {
  if (!m) return
  console.time('mathc')
  const [ , path, line, col, text ] = m.match(/$/)
  console.log(path, line, col, text)
  //console.log(a)
})

rg.on('exit', () => console.log('done'))
