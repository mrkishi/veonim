// SPEC: https://github.com/msgpack/msgpack/blob/master/spec.md

import { Transform } from 'stream'

export default class extends Transform {
  constructor() {
    super({ writableObjectMode: true })
  }
}
