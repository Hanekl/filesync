const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  superAdminLogin: () => ipcRenderer.send('super-admin-login'),
  superAdminLogout: () => ipcRenderer.send('super-admin-logout'),
  adminPanelCollapse: () => ipcRenderer.send('admin-panel-collapse'),
  adminPanelExpand: () => ipcRenderer.send('admin-panel-expand'),
  resizeWindow: (width, height) => ipcRenderer.send('resize-window', { width, height }),
  getWindowSize: () => ipcRenderer.invoke('get-window-size'),
})