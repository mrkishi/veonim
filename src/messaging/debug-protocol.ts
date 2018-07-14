// ref: https://github.com/Microsoft/vscode/blob/master/src/vs/workbench/parts/debug/node/debugAdapter.ts
import { DebugProtocol as DP } from 'vscode-debugprotocol'
import { Readable, Writable } from 'stream'
import {} from 'vscode-debug'

const TWO_CRLF = '\r\n\r\n'
const HEADER_LINE_SEP = /\r?\n/
const HEADER_FIELD_SEP = /: */
const TWO_CRLF_LENGTH = TWO_CRLF.length

// TODO: define functions to register onMsg + onError handlers
const streamProcessor = (readable: Readable, writable: Writable) => (onMessage: Function, onError: Function) => {
  let rawData = Buffer.allocUnsafe(0)
  let contentLength = -1

  readable.on('data', (data: Buffer) => {
    rawData = Buffer.concat([rawData, data])

    while (true) {
      if (contentLength >= 0) {
        if (rawData.length >= contentLength) {
          const message = rawData.toString('utf8', 0, contentLength)
          rawData = rawData.slice(contentLength)
          contentLength = -1

          if (message.length > 0) {
            try {
              const data: DP.ProtocolMessage = JSON.parse(message)
              onMessage(data)
            } catch (e) {
              const err = new Error(`${(e.message || e)}\n${message}`)
              onError(err)
            }
          }

          continue
        }

        else {
          const idx = rawData.indexOf(TWO_CRLF)
          if (idx !== -1) {
            const header = rawData.toString('utf8', 0, idx)
            const lines = header.split(HEADER_LINE_SEP)

            for (const h of lines) {
              const kvPair = h.split(HEADER_FIELD_SEP)
              if (kvPair[0] === 'Content-Length') contentLength = Number(kvPair[1])
            }

            rawData = rawData.slice(idx + TWO_CRLF_LENGTH)

            continue
          }
        }

        break
      }
    }
  })

  const send = (message: DP.ProtocolMessage) => {
    if (!writable || !writable.write) return
    const json = JSON.stringify(message)
    const length = Buffer.byteLength(json, 'utf8')
    writable.write(`Content-Length: ${length}${TWO_CRLF}${json}`, 'utf8')
  }

  return { send }
}
