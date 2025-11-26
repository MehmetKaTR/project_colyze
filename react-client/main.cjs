const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

let win;
let pythonProcess;

const PYTHON_PORT = 5050;

// ✅ Geliştirme mi, paketli mi kontrol et
const isDev = !app.isPackaged;

// 🔹 Backend hazır mı kontrol
function checkBackendReady() {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      http.get(`http://127.0.0.1:${PYTHON_PORT}`, (res) => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          clearInterval(interval);
          resolve(true);
        }
      }).on('error', () => {});
    }, 800);
  });
}

function clearTempFolders() {
  const baseDir = isDev
    ? path.join(__dirname, 'flask-server')
    : path.join(process.resourcesPath, 'flask-server');

  const tempDirs = ['temp_frames', 'temp_texts'];
  tempDirs.forEach(dir => {
    const fullPath = path.join(baseDir, dir);
    console.log('Clear temp path ->', fullPath);
    if (fs.existsSync(fullPath)) {
      fs.readdirSync(fullPath).forEach(file => {
        const fp = path.join(fullPath, file);
        try {
          fs.rmSync(fp, { recursive: true, force: true });
        } catch (e) {
          console.error('Cannot remove', fp, e);
        }
      });
    }
  });
  console.log('Temp folders cleared from Electron');
}

// 🔹 Python backend başlat
function startPython() {
  // ✅ Build durumuna göre doğru path
  const pythonExePath = isDev
    ? path.join(__dirname, 'flask-server', 'app.exe') // geliştirme ortamında
    : path.join(process.resourcesPath,  'flask-server', 'app.exe'); // paketlenmiş uygulamada

  console.log('Python EXE path:', pythonExePath);

  // 🔹 EXE’yi başlat
  pythonProcess = spawn(pythonExePath, [], { stdio: 'inherit' });

  pythonProcess.on('close', (code) => console.log(`Python EXE kapandı. Kod: ${code}`));
}
/*
function clearTempFolders() {
  const baseDir = path.join(process.resourcesPath, 'flask-server'); // burada Python EXE ile aynı klasör
  const tempDirs = ['temp_frames', 'temp_texts'];
  tempDirs.forEach(dir => {
    const fullPath = path.join(baseDir, dir);
    console.log('Temps path:', fullPath);
    if (fs.existsSync(fullPath)) {
      fs.readdirSync(fullPath).forEach(file => {
        const fp = path.join(fullPath, file);
        fs.rmSync(fp, { recursive: true, force: true });
      });
    }
  });
  console.log('Temp folders cleared from Electron');
}
*/

// 🔹 Python durdur
function stopPython() {
  if (pythonProcess) {
    try {
      pythonProcess.kill();
    } catch (err) {
      console.error('Python kapanırken hata:', err);
    }
    pythonProcess = null;
    console.log("Python süreci kapatıldı.");
  }
}

// 🔹 Pencere oluştur
async function createWindow() {
  startPython();
  console.log('⏳ Flask backend başlatılıyor...');
  await checkBackendReady();
  console.log('✅ Flask backend hazır.');

  win = new BrowserWindow({
    width: 1920,
    height: 1080,
    icon: path.join(__dirname, 'colyze_logo.ico'),
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const indexPath = isDev
    ? path.join(__dirname, 'dist', 'index.html')
    : path.join(__dirname, 'build', 'index.html');

  win.loadFile(indexPath);
  win.webContents.openDevTools({ mode: 'detach' }); // React tarafı loglar için

  // 🔹 Pencere kapatma güvenli
  win.on('close', () => {
    if (pythonProcess) {
      stopPython();
      clearTempFolders();
    }
    win = null;
  });
}

// 🔹 IPC eventleri
ipcMain.on('window-minimize', () => win && win.minimize());
ipcMain.on('window-maximize', () => {
  if (!win) return;
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});
ipcMain.on('window-close', () => win && win.close());

// 🔹 Electron app lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  stopPython();
  if (process.platform !== 'darwin') app.quit();
  clearTempFolders();
});

app.on('before-quit', () => stopPython());
