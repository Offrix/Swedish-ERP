param()

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent

Push-Location $repoRoot
try {
  & node --test `
    "tests/unit/platform-composition-step3.test.mjs" `
    "tests/unit/phase14-async-jobs.test.mjs" `
    "tests/unit/phase14-rulepack-registry.test.mjs"

  if ($LASTEXITCODE -ne 0) {
    Write-Error "Checkpoint V1 platform and rulepack verification failed."
  }

  & "$PSScriptRoot\verify-phase14-resilience.ps1"

  if ($LASTEXITCODE -ne 0) {
    Write-Error "Checkpoint V1 resilience verification failed."
  }

  Write-Host "Checkpoint V1 platform and rulepack verification passed."
}
finally {
  Pop-Location
}
