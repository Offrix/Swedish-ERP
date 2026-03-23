param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "tests/unit/phase13-public-api.test.mjs",
  "tests/integration/phase13-public-api-api.test.mjs",
  "tests/e2e/phase13-public-api-flow.test.mjs"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 13.1 verification paths:`n - " + ($missing -join "`n - "))
}

& node --test `
  "tests/unit/phase13-public-api.test.mjs" `
  "tests/integration/phase13-public-api-api.test.mjs" `
  "tests/e2e/phase13-public-api-flow.test.mjs"

if ($LASTEXITCODE -ne 0) {
  Write-Error "Phase 13.1 verification failed."
}

Write-Host "Phase 13.1 public API verification passed."
