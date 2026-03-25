param()

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent

Push-Location $repoRoot
try {
  & node --test `
    "tests/unit/phase14-async-jobs.test.mjs" `
    "tests/unit/phase14-resilience.test.mjs" `
    "tests/unit/phase14-security.test.mjs" `
    "tests/integration/phase14-resilience-api.test.mjs" `
    "tests/integration/phase14-security-api.test.mjs" `
    "tests/e2e/phase14-resilience-flow.test.mjs" `
    "tests/e2e/phase14-security-flow.test.mjs"

  if ($LASTEXITCODE -ne 0) {
    Write-Error "Checkpoint V7 resilience and security tests failed."
  }

  & "$PSScriptRoot\verify-phase14-security-review.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Checkpoint V7 security review verification failed."
  }

  & "$PSScriptRoot\verify-phase14-resilience.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Checkpoint V7 resilience verification failed."
  }

  Write-Host "Checkpoint V7 resilience, backup, replay and emergency disable verification passed."
}
finally {
  Pop-Location
}
