'use strict'

const { deepStrictEqual: same } = require('assert')
const proxyquire = require('proxyquire').noCallThru()
const Module = require('module')
const path = require('path')
const fs = require('fs')
const originalModuleLoader = Module._load

const relativeFakes = obj => Object.keys(obj).reduce((res, key) => {
  const val = Reflect.get(obj, key)
  Reflect.set(res, `../${key}`, val)
  return res
}, {})

const requireModule = (name, freshLoad) => {
  const modPath = require.resolve(`../build/${name}`)
  delete require.cache[modPath]
  return require(modPath)
}

const src = (name, fake, { noRelativeFake = false } = {}) => fake
  ? proxyquire(`../build/${name}`, noRelativeFake ? fake : relativeFakes(fake))
  : requireModule(name)

const resetModule = name => {
  delete require.cache[require.resolve(`../build/${name}`)]
}

const globalProxy = (name, implementation) => {
  Module._load = (request, ...args) => request === name
    ? implementation
    : originalModuleLoader(request, ...args)

  return () => Module._load = originalModuleLoader
}

const delay = time => new Promise(fin => setTimeout(fin, time))

const pathExists = path => new Promise(m => fs.access(path, e => m(!e)))

const spy = returnValue => {
  const spyFn = (...args) => (spyFn.calls.push(args), returnValue)
  spyFn.calls = []
  return spyFn
}

global.localStorage = {
  getItem: () => {},
  setItem: () => {},
}

const testDataPath = path.join(process.cwd(), 'test', 'data')

module.exports = { src, same, globalProxy, delay, pathExists, spy, resetModule, testDataPath }
