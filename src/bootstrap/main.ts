import { app, BrowserWindow, Menu } from 'electron'

console.log('FUCL:', process.env.VEONIM_DEV)

if (process.env.VEONIM_DEV) {
  const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer')
  installExtension(REACT_DEVELOPER_TOOLS)
}

let win: Electron.BrowserWindow
app.setName('veonim')
Menu.setApplicationMenu(new Menu())

app.on('ready', async () => {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    frame: true,
    titleBarStyle: 'hidden',
    backgroundColor: '#222',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegrationInWorker: true
    }
  })

  win.loadURL(`file:///${__dirname}/index.html`)

  if (process.env.VEONIM_DEV) {
    console.log(`veonim started in develop mode. you're welcome`)
    win.webContents.openDevTools()
  }
})
