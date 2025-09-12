const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let win;
let pythonProcess;

function createWindow() {
  win = new BrowserWindow({
    width: 1920,
    height: 1080,
    frame: false, // Frameless
    icon: path.join(__dirname, 'src/assets/colyze_logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile(path.join(__dirname, 'dist/index.html'));

  // 🔹 Python backend başlat
  const pythonScript = path.join(__dirname, '..', 'flask-server', 'app.py');
  pythonProcess = spawn('python', [pythonScript]);

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[PYTHON] ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[PYTHON ERROR] ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python kapandı. Kod: ${code}`);
  });
}

app.whenReady().then(createWindow);

// 🔴 Uygulama kapanırken Python’u da kapat
function stopPython() {
  if (pythonProcess) {
    pythonProcess.kill('SIGTERM');
    pythonProcess = null;
    console.log("Python süreci kapatıldı.");
  }
}

app.on('before-quit', stopPython);

app.on('window-all-closed', () => {
  stopPython();
  if (process.platform !== 'darwin') app.quit();
});

// IPC eventleri
ipcMain.on('window-minimize', () => win.minimize());

ipcMain.on('window-maximize', () => {
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});

ipcMain.on('window-close', () => {
  stopPython();
  win.close();
});
