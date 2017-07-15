import { ipcRenderer as ipc } from 'electron'

export const pub = (event: string, ...args: any[]) => ipc.send(event, ...args)
export const sub = (event: string, callback: Function) => ipc.on(event, callback)
export const unsub = (event: string) => ipc.removeAllListeners(event)
