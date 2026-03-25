param()

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent

Push-Location $repoRoot
try {
  & node --test `
    "tests/unit/phase32-project-workspace.test.mjs" `
    "tests/integration/phase32-project-workspace-api.test.mjs" `
    "tests/unit/phase28-hus-gates.test.mjs" `
    "tests/integration/phase28-hus-gates-api.test.mjs" `
    "tests/unit/phase29-personalliggare-industry-packs.test.mjs" `
    "tests/integration/phase29-personalliggare-identity-api.test.mjs"

  if ($LASTEXITCODE -ne 0) {
    Write-Error "Checkpoint V4 project, HUS or personalliggare contract tests failed."
  }

  & "$PSScriptRoot\verify-phase10-projects.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Checkpoint V4 projects verification failed."
  }

  & "$PSScriptRoot\verify-phase10-field.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Checkpoint V4 field verification failed."
  }

  & "$PSScriptRoot\verify-phase10-build.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Checkpoint V4 build/HUS/personalliggare verification failed."
  }

  Write-Host "Checkpoint V4 project, HUS and personalliggare verification passed."
}
finally {
  Pop-Location
}
