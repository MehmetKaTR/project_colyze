# Windows Build / Setup

## Folder layout
- `react-client/`: Electron + React UI
- `flask-server/`: Python backend
- `scripts/build-backend.ps1`: builds backend `app.exe`
- `scripts/build-setup.ps1`: builds installer (`.exe`)

## Required tools
- Node.js + npm
- Python
- PyInstaller (`pip install pyinstaller`)

## Build steps
1. Backend exe:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-backend.ps1
```
2. Installer (NSIS setup):
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-setup.ps1
```

## Output
- Installer files are generated under:
`react-client\dist_electron`

## Notes
- Electron package includes `flask-server` via `extraResources`.
- App resolves backend exe from:
  - Dev: `flask-server\app.exe` then `flask-server\dist\app.exe`
  - Packaged: `resources\flask-server\app.exe` then `resources\flask-server\dist\app.exe`
