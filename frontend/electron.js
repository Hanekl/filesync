const { app, BrowserWindow } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  })

  const isDev = !app.isPackaged
  if (isDev) {
    win.loadURL('http://localhost:3000')
  } else {
    win.loadFile(path.join(__dirname, 'build', 'index.html'))
  }

  return win
}

  const gotTheLock = app.requestSingleInstanceLock()

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

app.whenReady().then(() => {
  const win = createWindow()

  if (app.isPackaged) {
    console.log('업데이트 체크 시작')
    autoUpdater.checkForUpdatesAndNotify()

    autoUpdater.on('checking-for-update', () => {
      console.log('업데이트 확인 중...')
    })

    autoUpdater.on('update-not-available', () => {
      console.log('최신 버전이에요')
    })

    autoUpdater.on('error', (err) => {
      console.log('업데이트 오류:', err)
    })

    autoUpdater.on('update-available', () => {
      win.webContents.executeJavaScript(`alert('새 업데이트가 있어요! 다운로드 중...')`)
    })

    autoUpdater.on('update-downloaded', () => {
      win.webContents.executeJavaScript(`
        if (confirm('업데이트가 완료됐어요. 지금 재시작할까요?')) {
          window.__restartApp = true
        }
      `).then(() => {
        autoUpdater.quitAndInstall()
      })
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})