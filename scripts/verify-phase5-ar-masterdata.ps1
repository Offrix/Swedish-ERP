param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "packages/domain-ar/src/index.mjs",
  "packages/domain-ar/src/index.ts",
  "packages/db/migrations/20260321110000_phase5_ar_masterdata.sql",
  "packages/db/seeds/20260321110010_phase5_ar_masterdata_seed.sql",
  "packages/db/seeds/20260321111000_phase5_ar_masterdata_demo_seed.sql",
  "tests/unit/ar-phase5-1.test.mjs",
  "tests/integration/phase5-ar-masterdata-api.test.mjs",
  "tests/e2e/phase5-ar-masterdata-flow.test.mjs",
  "docs/runbooks/fas-5-ar-masterdata-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 5.1 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 5.1 AR masterdata verification passed."
