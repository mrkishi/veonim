import { Actions, Events, merge } from '../../utils'
import { call, notify, define } from '../neovim-client'
import { onVimCreate } from '../sessions'
import { h, app } from './plugins'
const { cmd } = notify
