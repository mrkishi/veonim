import { on, sub, request, notify } from './neovim-client'
import { remote } from 'electron'
const action = sub('action')
const { attach, switchTo } = notify
const { create } = request

interface Vim { id: number, name: string, active: boolean }
const vims = new Map<number, Vim>()
const onReady = new Set<Function>()
const notifyReady = () => onReady.forEach(cb => cb())

export const onVimCreate = (fn: Function) => onReady.add(fn)
export default (id: number) => {
  vims.set(id, { id, name: 'main', active: true })
  notifyReady()
}

export const createVim = async (name: string) => {
  const id = await create()
  attach(id)
  switchTo(id)
  vims.set(id, { id, name, active: true })
  notifyReady()
}

export const switchVim = async (id: number) => {
  if (!vims.has(id)) return
  switchTo(id)
  vims.get(id)!.active = true
}

export const renameVim = (id: number, newName: string) => {
  if (!vims.has(id)) return
  vims.get(id)!.name = newName
}

export const getNameForSession = (id: number) => vims.has(id) && vims.get(id)!.name

export const getCurrentName = () => {
  const active = [...vims.values()].find(a => a.active)
  return active ? active.name : ''
}

export const renameCurrent = (name: string) => {
  const active = [...vims.values()].find(a => a.active)
  if (!active) return
  renameVim(active.id, name)
}

action('vim-switch', () => {
  console.log('switch to vim')
  switchVim(1)
})

on.exit((id: number) => {
  if (!vims.has(id)) return
  vims.delete(id)
  if (!vims.size) return remote.app.quit()

  const next = Math.max(...vims.keys())
  switchVim(next)
})