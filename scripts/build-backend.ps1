$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptRoot
$backendDir = Join-Path $repoRoot "flask-server"
$specPath = Join-Path $backendDir "app.spec"
$distExe = Join-Path $backendDir "dist\\app.exe"
$rootExe = Join-Path $backendDir "app.exe"

if (-not (Test-Path $specPath)) {
  throw "app.spec not found: $specPath"
}

Write-Host "[backend] Building Flask executable with PyInstaller..."
Push-Location $backendDir
try {
  if ($env:BACKEND_PYTHON) {
    $pythonExe = $env:BACKEND_PYTHON
  } elseif ($env:VIRTUAL_ENV) {
    $venvPython = Join-Path $env:VIRTUAL_ENV "Scripts\\python.exe"
    if (Test-Path $venvPython) {
      $pythonExe = $venvPython
    } else {
      $pythonExe = (Get-Command python -ErrorAction Stop).Source
    }
  } else {
    $pythonExe = (Get-Command python -ErrorAction Stop).Source
  }
  Write-Host "[backend] Python -> $pythonExe"
  if ($env:VIRTUAL_ENV) {
    Write-Host "[backend] VIRTUAL_ENV -> $($env:VIRTUAL_ENV)"
  } else {
    Write-Warning "[backend] VIRTUAL_ENV is empty. Make sure your backend env is activated."
  }
  if (-not (Test-Path $pythonExe)) {
    throw "Python executable not found: $pythonExe"
  }

  if (Test-Path $distExe) {
    Remove-Item -Force $distExe
  }
  & $pythonExe -m PyInstaller --noconfirm $specPath
  if ($LASTEXITCODE -ne 0) {
    throw "PyInstaller failed with exit code $LASTEXITCODE"
  }
}
finally {
  Pop-Location
}

if (-not (Test-Path $distExe)) {
  throw "Backend build finished but app.exe not found: $distExe"
}

Copy-Item -Force $distExe $rootExe
Write-Host "[backend] OK -> $distExe"
Write-Host "[backend] Copied -> $rootExe"
