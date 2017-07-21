import { req, api, on, onRedraw, onExit, onRequest, subscribe, switch1, switch2 } from './transport'
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

type VimVariable = { [key: string]: any }

export const g = new Proxy({} as VimVariable, {
  get: async (_, key) => {
    const val = await req.getVar(key as string).catch(e => e)
    if (!Array.isArray(val) && val[1] !== 'Key not found') return val
  },
  set: (_, key, val) => (api.setVar(key as string, val), true)
})

export const getColorByName = (name: string) => req.getColorByName(name)
export const attach = (width: number, height: number, opts = baseAttachOpts) => api.uiAttach(width, height, { ...baseAttachOpts, ...opts })
export const resize = (width: number, height: number) => api.uiTryResize(width, height)
export const input = (m: string) => api.input(m)
export const cmd = (m: string) => api.command(m)
export const ex = (m: string) => req.commandOutput(m)
export const expr = (m: string) => req.eval(m)
export const buffers = () => req.listBufs()
export const action = (event: string, fn: Function) => watchers.add(event, fn)
export const call: Functions = onFnCall((name: string, args: any[] = []) => req.callFunction(name, args))
export const getColor = async (id: number) => {
  const [ fg = 0, bg = 0 ] = await Promise.all([
    call.synIDattr(id, 'fg#'),
    call.synIDattr(id, 'bg#')
  ]).catch(e => e)

  return { fg, bg }
}

subscribe('veonim', ([ event, ...args ]) => watchers.notify(event, args))

export { req, api, on, onRedraw, onExit, onRequest, subscribe, switch1, switch2 }
