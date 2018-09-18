'use strict'

const { deepStrictEqual: same } = require('assert')
const proxyquire = require('proxyquire').noCallThru()

const relativeFakes = obj => Object.keys(obj).reduce((res, key) => {
  const val = Reflect.get(obj, key)
  Reflect.set(res, `../${key}`, val)
  return res
}, {})

const src = (name, fake) => fake
  ? proxyquire(`../build/${name}`, relativeFakes(fake))
  : require(`../build/${name}`)

module.exports = { src, same }
