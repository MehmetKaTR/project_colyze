const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const http = require('http');

let win;
let pythonProcess;
let isAppQuitting = false;
let backendLogStream = null;
let backendLogPath = null;

const PYTHON_PORT = 5050;
const isDev = !app.isPackaged;

// Temp klasörlerini temizle
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

// Python başlat
function startPython() {
  if (pythonProcess) return;

  const pythonExePath = resolveBackendExePath();
  if (!pythonExePath) {
    const msg = [
      'Backend executable not found.',
      'Expected one of:',
      isDev
        ? path.join(__dirname, 'flask-server', 'dist', 'app.exe')
        : path.join(process.resourcesPath, 'flask-server', 'dist', 'app.exe'),
    ].join('\n');
    dialog.showErrorBox('Colyze Backend Error', msg);
    app.quit();
    return;
  }

  console.log('Python EXE path:', pythonExePath);

  const runtimeDir = path.join(app.getPath('userData'), 'backend_runtime');
  try {
    fs.mkdirSync(runtimeDir, { recursive: true });
  } catch (e) {
    console.error('Cannot create runtime dir:', runtimeDir, e);
  }
  backendLogPath = path.join(runtimeDir, 'backend.log');
  try {
    backendLogStream = fs.createWriteStream(backendLogPath, { flags: 'a' });
    backendLogStream.write(`\n\n===== ${new Date().toISOString()} backend start =====\n`);
    backendLogStream.write(`exe: ${pythonExePath}\n`);
    backendLogStream.write(`runtimeDir: ${runtimeDir}\n`);
  } catch (e) {
    console.error('Cannot open backend log file:', e);
  }

  pythonProcess = spawn(pythonExePath, [], {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    env: {
      ...process.env,
      COLYZE_RUNTIME_DIR: runtimeDir,
      PYTHONUNBUFFERED: '1',
    },
  });

  if (pythonProcess.stdout) {
    pythonProcess.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);
      if (backendLogStream) backendLogStream.write(text);
    });
  }
  if (pythonProcess.stderr) {
    pythonProcess.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      process.stderr.write(text);
      if (backendLogStream) backendLogStream.write(text);
    });
  }

  pythonProcess.on('close', (code) => {
    console.log(`Python EXE kapandı. Kod: ${code}`);
    if (backendLogStream) {
      backendLogStream.write(`\n===== backend close code=${code} =====\n`);
      backendLogStream.end();
      backendLogStream = null;
    }
    pythonProcess = null;
    if (!isAppQuitting && code !== 0) {
      console.error('Backend beklenmedik şekilde kapandı.');
      dialog.showErrorBox(
        'Colyze Backend Crashed',
        `Backend process exited with code ${code}.\nLog: ${backendLogPath || 'N/A'}`
      );
    }
  });

  pythonProcess.on('error', (err) => {
    console.error('Python process error:', err);
    if (backendLogStream) {
      backendLogStream.write(`\n[spawn error] ${String(err)}\n`);
      backendLogStream.end();
      backendLogStream = null;
    }
    dialog.showErrorBox(
      'Colyze Backend Start Error',
      `Failed to start backend process.\nLog: ${backendLogPath || 'N/A'}\nError: ${err.message || err}`
    );
  });
}

function resolveBackendExePath() {
  const candidates = isDev
    ? [
        path.join(__dirname, 'flask-server', 'app.exe'),
        path.join(__dirname, 'flask-server', 'dist', 'app.exe'),
      ]
    : [
        path.join(process.resourcesPath, 'flask-server', 'app.exe'),
        path.join(process.resourcesPath, 'flask-server', 'dist', 'app.exe'),
      ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

// Python durdur
function stopPython() {
  if (pythonProcess) {
    try {
      const pid = pythonProcess.pid;
      pythonProcess.kill();
      if (pid) {
        setTimeout(() => {
          if (pythonProcess) {
            try {
              spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
            } catch (e) {
              console.error('taskkill error:', e);
            }
          }
        }, 1200);
      }
    } catch (err) {
      console.error('Python kapanırken hata:', err);
    }
    pythonProcess = null;
    console.log("Python süreci kapatıldı.");
  }
}

// Pencere oluştur
async function createWindow() {
  startPython();
  console.log('⏳ Flask backend başlatılıyor...');

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

  // Otomatik açma kapatıldı — gizli olacak
  // win.webContents.openDevTools({ mode: 'detach' });

  // DEVTOOLS GİZLİ TETİKLEME MEKANİZMASI (F10 x 3)
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

  // güvenli kapanış
  win.on('close', () => {
    if (pythonProcess) {
      stopPython();
      clearTempFolders();
    }
    win = null;
  });
}

// IPC eventleri
ipcMain.on('window-minimize', () => win && win.minimize());
ipcMain.on('window-maximize', () => {
  if (!win) return;
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});
ipcMain.on('window-close', () => win && win.close());

// Electron lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  isAppQuitting = true;
  stopPython();
  if (process.platform !== 'darwin') app.quit();
  clearTempFolders();
});

app.on('before-quit', () => {
  isAppQuitting = true;
  stopPython();
});

function pingBackend(pathname = '/healthz', timeoutMs = 2000) {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: '127.0.0.1',
        port: PYTHON_PORT,
        path: pathname,
        timeout: timeoutMs,
      },
      (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 300);
        res.resume();
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
      resolve(false);
    });
    req.on('error', () => resolve(false));
  });
}

ipcMain.handle('backend-wait-ready', async (_event, payload = {}) => {
  const pathname = typeof payload.path === 'string' ? payload.path : '/healthz';
  const timeoutMs = Number(payload.timeoutMs || 35000);
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const ok = await pingBackend(pathname, 2000);
    if (ok) return { ok: true };
    await new Promise((r) => setTimeout(r, 700));
  }
  return { ok: false, logPath: backendLogPath || null };
-quit', () => {
  isAppQuitting = true;
  stopPython();
});
