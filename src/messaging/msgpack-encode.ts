// SPEC: https://github.com/msgpack/msgpack/blob/master/spec.md

import { encode } from 'msgpack-lite'

const i8_max = 2**8 - 1
const i16_max = 2**16 - 1
const i32_max = 2**32 - 1
const u8_min = -1 * 2**(8 - 1)
const u16_min = -1 * 2**(16 - 1)
const u32_min = -1 * 2**(32 - 1)
const negativeFixInt_min = -(2**5)
const u8_max = 2**(8 - 1) - 1

const tests = [
  u16_min+20,
  u16_min-3,
  u8_min-3,
  -100,
  -32,
  127-3,
  127,
  128,
  i8_max-3,
  i16_max-3,
  i16_max+20,
]

const sizeof = {
  str: ({ length }: { length: number }) => {
    if (length < 32) return [0xa0 + length]
    if (length <= i8_max) return [0xd9, length]
    if (length <= i16_max) return [0xda, length]
    if (length <= i32_max) return [0xdb, length]
    return [0xa0 + length]
  },
  arr: ({ length }: { length: number }) => {
    if (length < 16) return [0x90 + length]
    if (length <= i16_max) return [0xdc, length]
    if (length <= i32_max) return [0xdd, length]
    return [0x90 + length]
  },
}

const fromNum = (m: number): Buffer => {
  // fixint
  if (m >= 0 && m <= u8_max) return Buffer.from([m])

  // uint8
  if (m >= 0 && m <= i8_max) {
    const raw = Buffer.alloc(2)
    raw[0] = 0xcc
    raw.writeUInt8(m, 1)
    return raw
  }

  // uint16
  if (m >= 0 && m <= i16_max) {
    const raw = Buffer.alloc(3)
    raw[0] = 0xcd
    raw.writeUInt16BE(m, 1)
    return raw
  }

  // uint32
  if (m >= 0 && m <= i32_max) {
    const raw = Buffer.alloc(5)
    raw[0] = 0xce
    raw.writeUInt32BE(m, 1)
    return raw
  }

  // -fixint
  if (m < 0 && m >= negativeFixInt_min) return Buffer.from([m])

  // -int8
  if (m >= u8_min && m < 0) {
    const raw = Buffer.alloc(2)
    raw[0] = 0xd0
    raw.writeInt8(m, 1)
    return raw
  }

  // -int16
  if (m >= u16_min && m < 0) {
    const raw = Buffer.alloc(3)
    raw[0] = 0xd1
    raw.writeInt16BE(m, 1)
    return raw
  }

  // -int32
  if (m >= u32_min && m < 0) {
    const raw = Buffer.alloc(5)
    raw[0] = 0xd2
    raw.writeInt32BE(m, 1)
    return raw
  }

  console.warn('msgpack: can not encode number:', m)
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
  // const val = [2, 'ok', test]
  const val = test
  console.log('val', val)
  const enc = rawenc(val)
  console.log('raw-enc:', hex(enc))

  const res2 = encode(val)
  console.log('mpk-enc:', hex(res2))
})
