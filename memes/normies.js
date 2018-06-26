'use strict'

const a = 42
console.log('a', a)

const addOne = num => {
  const res = num + 1
  return res
}

const b = addOne(a)
console.log('b', b)

setTimeout(() => {
  console.log('later message')
}, 1e3)
