import { on, initState } from '../state/trade-federation'
import { merge } from '../support/utils'

export interface FileDir {
  name: string,
  file: boolean,
  dir: boolean,
}

export interface ExplorerParams {
  cwd: string,
  path: string,
  paths: FileDir[],
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
  showExplorer: (params: ExplorerParams) => void,
}

on.showExplorer((s, params: ExplorerParams) => {
  merge(s.explorer, params)
})
