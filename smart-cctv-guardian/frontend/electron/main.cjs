const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow;

function checkServerReady(url, callback) {
  const req = http.get(url, (res) => {
    if (res.statusCode === 200) {
      callback(true);
    } else {
      setTimeout(() => checkServerReady(url, callback), 500);
    }
  });
  req.on('error', () => {
    setTimeout(() => checkServerReady(url, callback), 500);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0a0a0a',
    title: 'Smart CCTV Guardian - Tactical AI Sentinel Station',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allows cross-origin video feeds on local LAN
    },
  });

  // Remove default application menu for tactical HUD look
  Menu.setApplicationMenu(null);

  const devUrl = 'http://localhost:5173';
  const prodPath = path.join(__dirname, '..', 'dist', 'index.html');

  // Try connecting to Vite dev server first
  checkServerReady(devUrl, (ready) => {
    if (ready) {
      mainWindow.loadURL(devUrl);
    } else {
      mainWindow.loadFile(prodPath);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
