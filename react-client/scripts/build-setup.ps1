$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootScript = Join-Path (Split-Path -Parent $here) "..\scripts\build-setup.ps1"
& powershell -NoProfile -ExecutionPolicy Bypass -File $rootScript
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
