import { app, BrowserWindow, Menu } from 'electron'
import { register, sub } from './pubsub'

let win: Electron.BrowserWindow
app.setName('veonim')
Menu.setApplicationMenu(new Menu())

app.on('ready', () => {
  win = new BrowserWindow({
    x: 0,
    y: 0,
    width: 700,
    height: 800,
    frame: false,
    backgroundColor: '#222',
    webPreferences: {
      nodeIntegrationInWorker: true
    }
  })

  register(win)
  sub('reload', () => win.webContents.reload())
  sub('fullscreen', () => win.setFullScreen(!win.isFullScreen()))
  win.loadURL(`file:///${__dirname}/index.html`)

  if (process.env.VEONIM_DEV) {
    win.webContents.openDevTools()
  }
})
