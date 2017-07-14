#!/usr/bin/env node
process.title = 'veonim'

import { attach } from './core/neovim'
import './core/render'

attach(100, 80)

// async plugin loading after (hopefully) initial render pass
// TODO: soon!
//setImmediate(() => require('./plugins'))
