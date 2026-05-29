const { app, BrowserWindow } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory, additionalData) => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  })

  if (!app.isPackaged) {
    win.loadURL('http://localhost:3000')
  } else {
    win.loadFile(path.join(__dirname, 'build', 'index.html'))
  }

  return win
}

app.whenReady().then(() => {
  const win = createWindow()

  win.webContents.on('did-finish-load', () => { 
    win.webContents.executeJavaScript(`window.__APP_VERSION__ = '${app.getVersion()}'`)
  })

  autoUpdater.checkForUpdatesAndNotify()

  autoUpdater.on('download-progress', (progressObj) => {
    win.webContents.executeJavaScript(`
      window.dispatchEvent(new CustomEvent('update-progress', { detail: ${progressObj.percent.toFixed(0)} }))
    `)
  })

  autoUpdater.on('update-downloaded', () => {
    win.webContents.executeJavaScript(`
      window.dispatchEvent(new CustomEvent('update-downloaded'))
    `)
    setTimeout(() => autoUpdater.quitAndInstall(), 3000)
  })

  autoUpdater.on('error', (err) => {
    win.webContents.executeJavaScript(`console.log('업데이트 오류: ${err.message}')`)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})