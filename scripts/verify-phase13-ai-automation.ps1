param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "tests/unit/phase13-automation.test.mjs",
  "tests/integration/phase13-automation-api.test.mjs",
  "tests/e2e/phase13-automation-flow.test.mjs"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 13.3 verification paths:`n - " + ($missing -join "`n - "))
}

& node --test `
  "tests/unit/phase13-automation.test.mjs" `
  "tests/integration/phase13-automation-api.test.mjs" `
  "tests/e2e/phase13-automation-flow.test.mjs"

if ($LASTEXITCODE -ne 0) {
  Write-Error "Phase 13.3 verification failed."
}

Write-Host "Phase 13.3 AI automation verification passed."
