import { ChildProcess } from 'child_process'
import { onFnCall } from '../support/utils'
import * as rpc from 'vscode-jsonrpc'

export interface Server {
  request: { [index: string]: (...params: any[]) => Promise<any> }
  notify: { [index: string]: (...params: any[]) => void }
  on(method: string, cb: (params: any) => any): void,
  onRequest(method: string, cb: (params: any) => Promise<any>): void,
  onError(cb: (e: any) => void): void,
  onExit(cb: (e: void) => void): void,
}

export interface Transports {
  ipc(process: ChildProcess): Server,
    // TODO: figure out how to do buffered TCP with reconnect in vscode-jsonrpc
  tcp(port: number): Server,
}

const initConnection = (reader: rpc.StreamMessageReader, writer: rpc.StreamMessageWriter) => {
  const api = {} as Server
  const conn = rpc.createMessageConnection(reader, writer)

  api.request = onFnCall((method, args) => conn.sendRequest(method, ...args))
  api.notify = onFnCall((method, args) => conn.sendNotification(method, ...args))
  api.on = (method, cb) => conn.onNotification(method, cb)
  api.onRequest = (method, cb) => conn.onRequest(method, cb)
  api.onError = cb => conn.onError(cb)
  api.onExit = cb => conn.onClose(cb)

  conn.listen()
  return api
}

export const connect = {} as Transports

connect.ipc = ({ stdout, stdin }) => initConnection(
  new rpc.StreamMessageReader(stdout),
  new rpc.StreamMessageWriter(stdin),
)
