// SPEC: https://github.com/msgpack/msgpack/blob/master/spec.md

import { encode } from 'msgpack-lite'

const msg = 'lol'
const test = [1, 2, msg, [ 129 ]]

const BIT8 = 2**8
const BIT16 = 2**16
const BIT32 = 2**32
const BIT64 = 2**64

const sizeof = {
  str: ({ length }: { length: number }) => {
    if (length < 32) return [0xa0 + length]
    if (length < BIT8) return [0xd9, length]
    if (length < BIT16) return [0xda, length]
    if (length < BIT32) return [0xdb, length]
    return [0xa0 + length]
  },
  arr: ({ length }: { length: number }) => {
    if (length < 16) return [0x90 + length]
    if (length < BIT16) return [0xdc, length]
    if (length < BIT32) return [0xdd, length]
    return [0x90 + length]
  },
}

const fromNum = (m: number) => {
  console.log('NUM:', m)
  if (m >= 0 && m < 127) return [m]
  if (m >= 0 && m < BIT8) {
    console.log('wuuut')
    const raw = Buffer.alloc(2)
    raw[0] = 0xcc
    raw.writeUInt8(m, 1)
    return raw
  }
  if (m >= 0 && m < BIT16) {
    const raw = Buffer.alloc(3)
    raw[0] = 0xcd
    // TODO: where does this val come from?
    //raw[2] = 1
    raw.writeUInt16BE(m, 1)
    return raw
  }
  if (m >= 0 && m < BIT32) {
    const raw = Buffer.alloc(9)
    raw[0] = 0xce
    raw[2] = 1
    raw.writeUInt32BE(m, 3)
    return raw
  }
  if (m >= 0 && m < BIT64) return [0xcf, Buffer.alloc(4).writeUInt32BE(m, 4)]
  // TODO: signed ints
  return [m]
}

const fromStr = (str: string) => {
  const raw = Buffer.from(str)
  return [...sizeof.str(raw), ...raw]
}

const fromArr = (arr: any[]): number[] => {
  const raw = arr.reduce((m, item) => {
    if (typeof item === 'string') return [...m, ...fromStr(item)]
    if (Array.isArray(item)) return [...m, ...fromArr(item)]
    if (typeof item === 'number') return [...m, ...fromNum(item)]

    console.warn('dunno how to encode this', item, typeof item)
    return m
  }, [])

  return [...sizeof.arr(arr), ...raw]
}

const enc = Buffer.from(fromArr(test))
console.log('raw-enc:', enc)

const res2 = encode(test)
console.log('mpk-enc:', res2)
