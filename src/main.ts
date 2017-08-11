import { app, BrowserWindow, Menu } from 'electron'

let win: Electron.BrowserWindow
app.setName('veonim')
Menu.setApplicationMenu(new Menu())

app.on('ready', () => {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    backgroundColor: '#222',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegrationInWorker: true
    }
  })

  win.loadURL(`file:///${__dirname}/index.html`)
  win.webContents.toggleDevTools()
})
