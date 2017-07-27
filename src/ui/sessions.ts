import { on, sub, request, notify } from './neovim-client'
import { remote } from 'electron'
const action = sub('action')
const { attach, switchTo } = notify
const { create } = request

interface Vim { name: string, active: boolean }
const vims = new Map<number, Vim>()

export default (id: number) => vims.set(id, { name: 'main', active: true })

const createVim = async (name: string) => {
  const id = await create()
  attach(id)
  switchTo(id)
  vims.set(id, { name, active: true })
}

const switchVim = async (id: number) => {
  if (!vims.has(id)) return
  switchTo(id)
  vims.get(id)!.active = true
}

const renameVim = (id: number, newName: string) => {
  if (!vims.has(id)) return
  vims.get(id)!.name = newName
}

action('vim-rename', () => {
  console.log('rename vim')
  renameVim(1, 'lol')
})

action('vim-create', () => {
  console.log('create new vim')
  createVim('another lol')
})

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