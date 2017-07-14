import { app, BrowserWindow } from 'electron'
const DEVMODE = process.argv.includes('--dev')

let win
app.setName('veonim')
app.on('ready', () => {
  win = new BrowserWindow({ width: 1200, height: 800 })
  win.loadURL(`file:///${__dirname}/index.html`)
  DEVMODE && win.webContents.openDevTools()
})
