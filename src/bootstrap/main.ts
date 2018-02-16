import { app, BrowserWindow, Menu } from 'electron'

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

    const {
      default: installExtension,
      REACT_DEVELOPER_TOOLS,
      REDUX_DEVTOOLS,
      REACT_PERF,
    } = require('electron-devtools-installer')

    const load = (ext: any) => installExtension(ext)
      .then((n: any) => console.log('loaded ext:', n))
      .catch((e: any) => console.log('failed to load ext because...', e))

    load(REACT_DEVELOPER_TOOLS)
    load(REDUX_DEVTOOLS)
    load(REACT_PERF)

    win.webContents.openDevTools()
  }
})
