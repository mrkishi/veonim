'use strict'

const { deepStrictEqual: same } = require('assert')
const proxyquire = require('proxyquire').noCallThru()
const Module = require('module')
const originalModuleLoader = Module._load

const relativeFakes = obj => Object.keys(obj).reduce((res, key) => {
  const val = Reflect.get(obj, key)
  Reflect.set(res, `../${key}`, val)
  return res
}, {})

const src = (name, fake, { noRelativeFake = false } = {}) => fake
  ? proxyquire(`../build/${name}`, noRelativeFake ? fake : relativeFakes(fake))
  : require(`../build/${name}`)

const globalProxy = (name, implementation) => {
  Module._load = (request, ...args) => request === name
    ? implementation
    : originalModuleLoader(request, ...args)

  return () => Module._load = originalModuleLoader
}

module.exports = { src, same, globalProxy }
