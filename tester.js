'use strict'
const e = require('./build/extensions')

e.load().then(async () => {
  const result = await e.activate.language('typescript')
  console.log('start TS extension result', result)
})
