import { ipcMain as ipc } from 'electron'

const windows = new Set<Electron.BrowserWindow>()

export const register = (window: Electron.BrowserWindow) => windows.add(window)
export const pub = (event: string, ...args: any[]) => windows.forEach(w => w.webContents.send(event, ...args))

export const sub = (event: string, callback: Function) => {
  const listener = (e: string, data: any) => e && callback(data)
  ipc.on(event, listener)
  return () => ipc.removeListener(event, listener)
}

export const once = (event: string, callback: Function) => {
  const listener = (e: string, data: any) => e && callback(data)
  ipc.once(event, listener)
  return () => ipc.removeListener(event, listener)
}
