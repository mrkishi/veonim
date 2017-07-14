#!/usr/bin/env node
process.title = 'veonim'

import { attach } from './neovim'
import './render'

attach(100, 80)

// async plugin loading after (hopefully) initial render pass
setImmediate(() => require('./plugins'))
