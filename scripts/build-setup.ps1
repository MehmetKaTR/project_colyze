$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptRoot
$clientDir = Join-Path $repoRoot "react-client"
$distElectronDir = Join-Path $clientDir "dist_electron"
$winUnpackedDir = Join-Path $clientDir "dist_electron\\win-unpacked"
$lockedBackendExe = Join-Path $winUnpackedDir "resources\\flask-server\\app.exe"
$lockedAppExe = Join-Path $winUnpackedDir "Colyze.exe"
$lockedSuffixes = @(
  "\resources\flask-server\app.exe",
  "\win-unpacked\colyze.exe",
  "\win-unpacked\Colyze.exe"
)

function Stop-LockingProcesses {
  param(
    [string[]]$CandidatePaths,
    [string[]]$CandidateSuffixes
  )

  $stopped = 0
  $all = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue
  foreach ($proc in $all) {
    $cmd = [string]$proc.CommandLine
    $exe = [string]$proc.ExecutablePath
    $match = $false

    foreach ($candidate in $CandidatePaths) {
      if (-not $candidate) { continue }
      if ($exe -and $exe -ieq $candidate) { $match = $true; break }
      if ($cmd -and $cmd -like "*$candidate*") { $match = $true; break }
    }
    if (-not $match) {
      foreach ($suffix in $CandidateSuffixes) {
        if (-not $suffix) { continue }
        if ($exe -and $exe.ToLower().EndsWith($suffix.ToLower())) { $match = $true; break }
        if ($cmd -and $cmd.ToLower().Contains($suffix.ToLower())) { $match = $true; break }
      }
    }
    if (-not $match -and $proc.Name -match "^(Colyze|app|electron|node)(\.exe)?$") {
      if ($cmd -and ($cmd -like "*dist_electron*" -or $cmd -like "*flask-server\\app.exe*")) {
        $match = $true
      }
    }

    if (-not $match) { continue }
    try {
      Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
      Write-Host "[setup] Stopped locking process PID=$($proc.ProcessId)"
      $stopped++
    } catch {
      Write-Warning "[setup] Could not stop PID=$($proc.ProcessId): $($_.Exception.Message)"
    }
  }
  return $stopped
}

function Remove-DirectoryRobust {
  param(
    [string]$TargetDir
  )

  if (-not (Test-Path $TargetDir)) {
    return
  }

  for ($i = 1; $i -le 6; $i++) {
    try {
      Get-ChildItem -Path $TargetDir -Recurse -Force -ErrorAction SilentlyContinue |
        ForEach-Object {
          try { $_.Attributes = 'Normal' } catch {}
        }
      Remove-Item -Path $TargetDir -Recurse -Force -ErrorAction Stop
      return
    } catch {
      Stop-LockingProcesses -CandidatePaths @($lockedBackendExe, $lockedAppExe) -CandidateSuffixes $lockedSuffixes | Out-Null
      Start-Sleep -Milliseconds (250 * $i)
      if ($i -eq 6) {
        throw "Could not clean directory: $TargetDir. Close running Colyze/app.exe processes and try again."
      }
    }
  }
}

Write-Host "[setup] Building backend + Electron installer..."
Stop-LockingProcesses -CandidatePaths @($lockedBackendExe, $lockedAppExe) -CandidateSuffixes $lockedSuffixes | Out-Null
if (Test-Path $winUnpackedDir) {
  Write-Host "[setup] Cleaning old win-unpacked..."
}
if (Test-Path $distElectronDir) {
  Write-Host "[setup] Cleaning old dist_electron..."
  Remove-DirectoryRobust -TargetDir $distElectronDir
}

Push-Location $clientDir
try {
  npm run build:setup
  if ($LASTEXITCODE -ne 0) {
    throw "npm run build:setup failed with exit code $LASTEXITCODE"
  }
}
finally {
  Pop-Location
}

Write-Host "[setup] Done. Check: react-client\\dist_electron"
