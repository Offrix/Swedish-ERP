param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "packages/domain-annual-reporting/src/index.mjs",
  "packages/domain-annual-reporting/src/index.ts",
  "packages/db/migrations/20260322140000_phase12_annual_reporting.sql",
  "packages/db/seeds/20260322140010_phase12_annual_reporting_seed.sql",
  "packages/db/seeds/20260322141000_phase12_annual_reporting_demo_seed.sql",
  "tests/unit/annual-reporting-phase12-1.test.mjs",
  "tests/integration/phase12-annual-reporting-api.test.mjs",
  "tests/e2e/phase12-annual-reporting-flow.test.mjs",
  "docs/runbooks/fas-12-annual-reporting-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 12.1 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 12.1 annual reporting verification passed."
