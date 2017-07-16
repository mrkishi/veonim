const DEVMODE = process.env.VEONIM_DEV
import { app, BrowserWindow } from 'electron'
import { register, sub } from './pubsub'

let win: Electron.BrowserWindow
app.setName('veonim')
app.on('ready', () => {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    backgroundColor: '#222'
  })

  register(win)
  sub('reload', () => win.webContents.reload())
  win.loadURL(`file:///${__dirname}/index.html`)
  DEVMODE && win.webContents.openDevTools()
})
