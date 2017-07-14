#!/usr/bin/env node
process.title = 'veonim'

import { attach } from './neovim'
import './render'
import { vimui } from './view'

vimui.setIndex(1)
vimui.focus()
attach(vimui.width, vimui.height)

// async plugin loading after (hopefully) initial render pass
setImmediate(() => require('./plugins'))
