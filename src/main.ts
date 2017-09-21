import { app, BrowserWindow, Menu } from 'electron'
import { getDefaultConfig } from './config-reader'

let win: Electron.BrowserWindow
app.setName('veonim')
Menu.setApplicationMenu(new Menu())
const configLoading: Promise<Map<string, any>> = Promise.race([
  getDefaultConfig(),
  new Promise(fin => setTimeout(() => fin(new Map()), 500))
])

const vimtype = {
  bool: (m: any) => !!<any>(m-0)
}

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
  win.webContents.toggleDevTools()
})
