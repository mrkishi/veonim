import { log } from '../utils'

console.log('hey whatsup')
setInterval(() => log `hey from browser! ${Date.now()}`, 2000)
