param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "tests/unit/phase14-resilience.test.mjs",
  "tests/integration/phase14-resilience-api.test.mjs",
  "tests/e2e/phase14-resilience-flow.test.mjs"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 14.2 verification paths:`n - " + ($missing -join "`n - "))
}

& node --test `
  "tests/unit/phase14-resilience.test.mjs" `
  "tests/integration/phase14-resilience-api.test.mjs" `
  "tests/e2e/phase14-resilience-flow.test.mjs"

if ($LASTEXITCODE -ne 0) {
  Write-Error "Phase 14.2 verification failed."
}

Write-Host "Phase 14.2 resilience verification passed."
