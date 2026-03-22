param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "packages/domain-reporting/src/index.mjs",
  "packages/domain-reporting/src/index.ts",
  "packages/db/migrations/20260322110000_phase11_reporting_exports.sql",
  "packages/db/seeds/20260322110010_phase11_reporting_exports_seed.sql",
  "packages/db/seeds/20260322111000_phase11_reporting_exports_demo_seed.sql",
  "tests/unit/reporting-phase11-1.test.mjs",
  "tests/integration/phase11-reporting-api.test.mjs",
  "tests/e2e/phase11-reporting-flow.test.mjs",
  "docs/runbooks/fas-11-reporting-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 11.1 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 11.1 reporting and drilldown verification passed."
