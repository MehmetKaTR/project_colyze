const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

let win;
let pythonProcess;

const PYTHON_PORT = 5050;
const isDev = !app.isPackaged;

// 🔹 Backend sağ mı kontrol
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

// 🔹 Temp klasörlerini temizle
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

// 🔹 Python başlat
function startPython() {
  const pythonExePath = isDev
    ? path.join(__dirname, 'flask-server', 'app.exe')
    : path.join(process.resourcesPath, 'flask-server', 'app.exe');

  console.log('Python EXE path:', pythonExePath);

  pythonProcess = spawn(pythonExePath, [], { stdio: 'inherit' });

  pythonProcess.on('close', (code) => console.log(`Python EXE kapandı. Kod: ${code}`));
}

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

  // ❌ Otomatik açma kapatıldı — gizli olacak
  // win.webContents.openDevTools({ mode: 'detach' });

  // 🔐 DEVTOOLS GİZLİ TETİKLEME MEKANİZMASI (F10 x 3)
  let f10Count = 0;
  let f10Timer = null;

  win.webContents.on("before-input-event", (event, input) => {
    if (input.type === "keyDown" && input.key === "F10") {

      f10Count++;

      // Timer reset
      if (f10Timer) clearTimeout(f10Timer);
      f10Timer = setTimeout(() => {
        f10Count = 0;
      }, 700);

      if (f10Count === 3) {
        if (win.webContents.isDevToolsOpened()) {
          win.webContents.closeDevTools();
        } else {
          win.webContents.openDevTools({ mode: "detach" });
        }
        f10Count = 0;
      }
    }
  });

  // 🔐 güvenli kapanış
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

// 🔹 Electron lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  stopPython();
  if (process.platform !== 'darwin') app.quit();
  clearTempFolders();
});

app.on('before-quit', () => stopPython());
