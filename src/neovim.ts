import { req, api, on, onRedraw, onRequest, subscribe } from './transport'
import { Watchers, onFnCall } from './utils'
import { Functions } from './functions'

const watchers = new Watchers()

const baseAttachOpts = {
  rgb: true,
  ext_popupmenu: false,
  ext_tabline: false,
  ext_wildmenu: false,
  ext_cmdline: false
}

export const attach = (width: number, height: number, opts = baseAttachOpts) => api.uiAttach(width, height, { ...baseAttachOpts, ...opts })
export const resize = (width: number, height: number) => api.uiTryResize(width, height)
export const input = (m: string) => api.input(m)
export const cmd = (m: string) => api.command(m)
export const buffers = () => req.listBufs()
export const action = (event: string, fn: Function) => watchers.add(event, fn)
export const call: Functions = onFnCall((name: string, args: any[] = []) => req.callFunction(name, args))

subscribe('veonim', ([ event, ...args ]) => watchers.notify(event, args))

export { req, api, on, onRedraw, onRequest, subscribe }
