import { app, BrowserWindow, Menu } from 'electron'
const macos = process.platform === 'darwin'

let win: Electron.BrowserWindow
app.setName('veonim')
Menu.setApplicationMenu(new Menu())

app.on('ready', async () => {
  win = new BrowserWindow({
    show: false,
    width: 800,
    height: 600,
    frame: macos,
    // TODO: will this work when we need to hide the title bar?
    // also, this freebie is only for macos so not buying too much...
    titleBarStyle: macos ? 'hidden' : undefined,
    backgroundColor: '#222',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegrationInWorker: true
    }
  })

  win.loadURL(`file:///${__dirname}/index.html`)
  //win.webContents.toggleDevTools()
})
