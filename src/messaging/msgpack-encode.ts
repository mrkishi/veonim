// SPEC: https://github.com/msgpack/msgpack/blob/master/spec.md

import { encode } from 'msgpack-lite'

const BIT8 = 2**8
const BIT16 = 2**16
const BIT32 = 2**32

const tests = [
  127-3,
  BIT8-3,
  BIT16-3,
  BIT16+20,
]

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

const fromNum = (m: number): Buffer => {
  // fixint
  if (m >= 0 && m < 127) return Buffer.from([m])

  // uint8
  if (m >= 0 && m < BIT8) {
    const raw = Buffer.alloc(2)
    raw[0] = 0xcc
    raw.writeUInt8(m, 1)
    return raw
  }

  // uint16
  if (m >= 0 && m < BIT16) {
    const raw = Buffer.alloc(3)
    raw[0] = 0xcd
    raw.writeUInt16BE(m, 1)
    return raw
  }

  // uint32
  if (m >= 0 && m < BIT32) {
    const raw = Buffer.alloc(5)
    raw[0] = 0xce
    raw.writeUInt32BE(m, 1)
    return raw
  }

  // TODO: signed ints


  return Buffer.from([m])
}

const fromStr = (str: string): Buffer => {
  const raw = Buffer.from(str)
  return Buffer.from([...sizeof.str(raw), ...raw])
}

const fromArr = (arr: any[]): Buffer => {
  const raw = arr.reduce((m, item) => {
    if (typeof item === 'string') return [...m, ...fromStr(item)]
    if (Array.isArray(item)) return [...m, ...fromArr(item)]
    if (typeof item === 'number') return [...m, ...fromNum(item)]
    // TODO: maps/objects

    console.warn('dunno how to encode this', item, typeof item)
    return m
  }, [])

  return Buffer.from([...sizeof.arr(arr), ...raw])
}

// TODO: maps/objects
const rawenc = (stuff: any): Buffer => {
  if (typeof stuff === 'string') return fromStr(stuff)
  if (Array.isArray(stuff)) return fromArr(stuff)
  if (typeof stuff === 'number') return fromNum(stuff)
  return Buffer.from(stuff)
}

const hex = ff => ff.reduce((m, s) => (m.push(s.toString(16).padStart(2, '0')), m), [])

tests.forEach(test => {
  const val = [2, 'ok', test]
  const enc = rawenc(val)
  console.log('raw-enc:', hex(enc))

  const res2 = encode(val)
  console.log('mpk-enc:', hex(res2))
})

