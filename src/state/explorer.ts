import { on, initState } from '../state/trade-federation'

interface FileDir {
  name: string,
  file: boolean,
  dir: boolean,
}

export interface Explorer {
  value: string,
  cwd: string,
  path: string,
  paths: FileDir[],
  cache: FileDir[],
  visible: boolean,
  index: number,
  pathMode: boolean,
  pathValue: string,
}

initState('explorer', {
  value: '',
  cwd: '',
  path: '',
  paths: [],
  cache: [],
  visible: false,
  index: 0,
  pathMode: false,
  pathValue: '',
})

export interface Actions {
  showExplorer: (cwd: string) => void,
}

on.showExplorer((s, cwd: string) => {
  s.explorer.cwd = cwd
})
