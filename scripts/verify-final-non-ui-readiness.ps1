param()

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent

Push-Location $repoRoot
try {
  & node scripts/lint.mjs
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Final non-UI readiness failed during lint."
  }

  & node scripts/typecheck.mjs
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Final non-UI readiness failed during typecheck."
  }

  & node scripts/build.mjs
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Final non-UI readiness failed during build."
  }

  & node scripts/security-scan.mjs
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Final non-UI readiness failed during security scan."
  }

  & "$PSScriptRoot\verify-step47-external-surface.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Final non-UI readiness failed during Step 47 verification."
  }

  & "$PSScriptRoot\verify-step48-golden-scenarios.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Final non-UI readiness failed during Step 48 verification."
  }

  & "$PSScriptRoot\verify-checkpoint-v1.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Final non-UI readiness failed during checkpoint V1."
  }

  & "$PSScriptRoot\verify-checkpoint-v2.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Final non-UI readiness failed during checkpoint V2."
  }

  & "$PSScriptRoot\verify-checkpoint-v3.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Final non-UI readiness failed during checkpoint V3."
  }

  & "$PSScriptRoot\verify-checkpoint-v4.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Final non-UI readiness failed during checkpoint V4."
  }

  & "$PSScriptRoot\verify-checkpoint-v5.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Final non-UI readiness failed during checkpoint V5."
  }

  & "$PSScriptRoot\verify-checkpoint-v7.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Final non-UI readiness failed during checkpoint V7."
  }

  & "$PSScriptRoot\run-pilot-parallel-runs.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Final non-UI readiness failed during pilot parallel runs."
  }

  Write-Host "Final non-UI readiness verification passed."
}
finally {
  Pop-Location
}
