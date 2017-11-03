import { delay } from './utils'
import { Api } from './api'

// TODO: this getMode/blocking/input/capture :messages is kinda hack.
// when neovim implements external dialogs, please revisit
const unblock = (api: Api, req: Api) => (): Promise<string[]> => new Promise(fin => {
  let neverGonnaGiveYouUp = false

  const timer = setTimeout(() => {
    neverGonnaGiveYouUp = true // never gonna let you down
    fin([])
  }, 2e3)

  const tryToUnblock = () => req.getMode().then(mode => {
    if (!mode.blocking) {
      Promise.race([
        req.commandOutput('messages').then(m => m.split('\n').filter(m => m)),
        delay(250).then(() => [])
      ]).then(fin)

      clearInterval(timer)
      return
    }

    api.input(`<Enter>`)
    if (!neverGonnaGiveYouUp) setImmediate(() => tryToUnblock())
  })

  tryToUnblock()
})

export default ({ api, req }: { api: Api, req: Api }) => ({
  unblock: unblock(api, req)
})
