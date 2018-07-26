import { SpawnOptions, ChildProcess } from 'child_process'

const platforms = new Map([
  ['darwin', 'mac'],
  ['win32', 'win'],
  ['linux', 'linux'],
])

const suffix = platforms.get(process.platform)
if (!suffix) throw new Error(`Unsupported platform ${process.platform}`)

type Binary = (args?: string[], options?: SpawnOptions) => ChildProcess

interface INeovim {
  run: Binary,
  runtime: string,
  path: string,
}

export const Neovim: INeovim = {
  run: require(`@veonim/neovim-${suffix}`).default,
  runtime: require(`@veonim/neovim-${suffix}`).vimruntime,
  path: require(`@veonim/neovim-${suffix}`).vimpath,
}

export const Ripgrep: Binary = require(`@veonim/ripgrep-${suffix}`).default
export const Archiver: Binary = require(`all-other-unzip-libs-suck-${suffix}`).default
