param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "tests/unit/phase14-migration.test.mjs",
  "tests/integration/phase14-migration-api.test.mjs",
  "tests/e2e/phase14-migration-flow.test.mjs"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 14.3 verification paths:`n - " + ($missing -join "`n - "))
}

& node --test `
  "tests/unit/phase14-migration.test.mjs" `
  "tests/integration/phase14-migration-api.test.mjs" `
  "tests/e2e/phase14-migration-flow.test.mjs"

if ($LASTEXITCODE -ne 0) {
  Write-Error "Phase 14.3 verification failed."
}

Write-Host "Phase 14.3 migration and go-live verification passed."
