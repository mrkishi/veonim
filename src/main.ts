const DEVMODE = process.env.VEONIM_DEV
import { app, BrowserWindow } from 'electron'
import { register, sub } from './pubsub'

let win: Electron.BrowserWindow
app.setName('veonim')
app.on('ready', () => {
  win = new BrowserWindow({
    width: 800,
    height: 400,
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
  DEVMODE && win.webContents.openDevTools()
})
