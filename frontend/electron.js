const { app, BrowserWindow, ipcMain } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')

const gotTheLock = app.requestSingleInstanceLock()
let win = null

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1152,
    minHeight: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.setMenu(null)

  if (!app.isPackaged) {
    win.loadURL('http://localhost:3000')
  } else {
    win.loadFile(path.join(__dirname, 'build', 'index.html'))
  }

  return win
}

app.whenReady().then(() => {
  win = createWindow()

  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript(`window.__APP_VERSION__ = '${app.getVersion()}'`)
  })

  // 창 닫힐 때 오프라인 처리
  win.on('close', () => {
    win.webContents.executeJavaScript(`
      (() => {
        const ip = localStorage.getItem('server_ip')
        const base = ip ? 'http://' + ip + ':8000' : 'http://127.0.0.1:8000'
        const user = window.__CURRENT_USER__
        if (user) navigator.sendBeacon(base + '/users/logout/' + user.id)
      })()
    `).catch(() => {})
  })

  // 창 크기 변경 (프리셋)
  ipcMain.on('resize-window', (event, { width, height }) => {
    if (win) {
      win.setSize(width, height)
      win.center()
    }
  })

  // 현재 창 크기 조회
  ipcMain.handle('get-window-size', () => {
    if (win) {
      const [width, height] = win.getSize()
      return { width, height }
    }
    return { width: 1280, height: 800 }
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