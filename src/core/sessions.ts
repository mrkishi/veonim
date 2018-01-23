import { onExit, attachTo, switchTo, create } from '../core/master-control'
import { pub } from '../messaging/dispatch'
import { remote } from 'electron'

interface Vim {
  id: number,
  name: string,
  active: boolean,
  path: string,
  nameFollowsCwd: boolean,
}

const vims = new Map<number, Vim>()
const cache = { id: -1 }

export default (id: number, path: string) => {
  vims.set(id, { id, path, name: 'main', active: true, nameFollowsCwd: true })
  cache.id = id
  pub('session:create', { id, path })
  pub('session:switch', id)
}

export const createVim = async (name: string, dir?: string) => {
  const { id, path } = await create({ dir })
  cache.id = id
  pub('session:create', { id, path })
  attachTo(id)
  switchTo(id)
  pub('session:switch', id)
  vims.forEach(v => v.active = false)
  vims.set(id, { id, path, name, active: true, nameFollowsCwd: !!dir })
}

export const switchVim = async (id: number) => {
  if (!vims.has(id)) return
  cache.id = id
  switchTo(id)
  pub('session:switch', id)
  vims.forEach(v => v.active = false)
  vims.get(id)!.active = true
}

export const renameVim = (id: number, newName: string) => {
  if (!vims.has(id)) return
  const vim = vims.get(id)!
  vim.name = newName
  vim.nameFollowsCwd = false
}

export const getNameForSession = (id: number) => vims.has(id) && vims.get(id)!.name

export const getCurrentName = () => {
  const active = [...vims.values()].find(v => v.active)
  return active ? active.name : ''
}

export const renameCurrent = (name: string) => {
  const active = [...vims.values()].find(v => v.active)
  if (!active) return
  renameVim(active.id, name)
}

export const renameCurrentToCwd = (cwd: string) => {
  const active = [...vims.values()].find(v => v.active)
  if (!active) return
  if (active.nameFollowsCwd) active.name = cwd
}

export const list = () => [...vims.values()].filter(v => !v.active).map(v => ({ id: v.id, name: v.name }))

export const sessions = {
  get current() { return cache.id }
}

onExit((id: number) => {
  if (!vims.has(id)) return
  vims.delete(id)
  if (!vims.size) return remote.app.quit()

  const next = Math.max(...vims.keys())
  switchVim(next)
})
