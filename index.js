const { app, BrowserWindow } = require('electron')
const path = require('path')
const { startServer } = require('./src/server')

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  // Create the browser window
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
    icon: path.join(__dirname, 'assets/icon.png'), // You can add an icon later
    titleBarStyle: 'default',
  })

  // Suppress common devtools errors in Electron
  mainWindow.webContents.on('console-message', (event, level, message) => {
    // Filter out known non-critical errors
    if (message.includes('Autofill.enable') ||
        message.includes('Autofill.setAddresses') ||
        message.includes('wasn\'t found')) {
      return; // Suppress these errors
    }
    // Only log errors and warnings to avoid cluttering the terminal
    if (level === 1 || level === 2) { // 1 = warning, 2 = error
      console.log(`[${level === 1 ? 'WARN' : 'ERROR'}] ${message}`);
    }
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173') // Vite dev server
    mainWindow.webContents.openDevTools() // Open dev tools in development
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html')) // Production build
  }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  try {
    // Start the backend server
    await startServer();
    console.log('Backend server started successfully');

    // Create the main window
    createWindow();
  } catch (error) {
    console.error('Failed to start backend server:', error);
    app.quit();
  }
})

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})