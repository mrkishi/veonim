const DEVMODE = process.argv.includes('--dev')
import { app, BrowserWindow } from 'electron'

let win
app.setName('veonim')
app.on('ready', () => {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    backgroundColor: '#222'
  })
  win.loadURL(`file:///${__dirname}/index.html`)
  DEVMODE && win.webContents.openDevTools()
})
