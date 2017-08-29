import * as defaultConfigs from './default-configs'
import { getInObjectByPath } from './utils'
import { g } from './ui/neovim'

export default (configName: string, cb: (val: any) => void) => {
  const vimKey = `vn_${configName.split('.').join('_')}`
  Reflect.get(g, vimKey).then((val: any) => val && cb(val))
  return getInObjectByPath(defaultConfigs, configName)
}
