import { app, BrowserWindow, Menu } from 'electron'
import { getDefaultConfig } from './config-reader'
const delay = (t: number) => new Promise(d => setTimeout(d, t))

const configLoading: Promise<Map<string, any>> = Promise.race([
  getDefaultConfig(),
  delay(500).then(() => new Map<string, any>())
])

const vimtype = {
  bool: (m: any) => !!<any>(m-0)
}

let win: Electron.BrowserWindow
app.setName('veonim')
Menu.setApplicationMenu(new Menu())

app.on('ready', async () => {
  const conf = await configLoading

  const config = (key: string, xform?: (val: any) => any) => ({ or: (backup: any) => {
    if (!conf.has(key)) return backup
    const val = conf.get(key)
    const result = typeof xform === 'function' ? xform(val) : val
    return typeof result === typeof backup ? result : backup
  }})

  win = new BrowserWindow({
    show: false,
    width: 800,
    height: 600,
    frame: config('window_frame', vimtype.bool).or(true),
    backgroundColor: '#222',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegrationInWorker: true
    }
  })

  win.loadURL(`file:///${__dirname}/index.html`)
})
