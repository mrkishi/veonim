
import { h, ui, delay, Actions, Events } from '../../utils'
import { VimBuffer } from '../../functions'
import { call } from '../neovim-client'

interface BufferInfo { name: string, base: string, modified?: boolean, dir: string }

const getBuffers = async (cwd: string): Promise<BufferInfo[]> => {
  const buffers = await call.Buffers()
  if (!buffers) return []
  
   return buffers
     .filter((m: VimBuffer, ix: number, arr: any[]) => arr.findIndex(e => e.name === m.name) === ix)
     .filter((m: VimBuffer) => !m.cur)
     .map(({ name, mod }) => ({
       name,
       base: basename(name),
       modified: mod,
       dir: cleanup(dirname(name), cwd)
     }))
}