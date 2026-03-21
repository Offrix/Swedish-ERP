param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "packages/domain-reporting/src/index.mjs",
  "packages/domain-reporting/src/index.ts",
  "packages/db/migrations/20260321070000_phase3_reporting_reconciliation.sql",
  "packages/db/seeds/20260321070010_phase3_reporting_reconciliation_seed.sql",
  "packages/db/seeds/20260321071000_phase3_reporting_reconciliation_demo_seed.sql",
  "tests/unit/reporting-phase3-3.test.mjs",
  "tests/integration/phase3-reporting-api.test.mjs",
  "tests/e2e/phase3-reporting-flow.test.mjs",
  "docs/runbooks/fas-3-reporting-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 3.3 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 3.3 reporting and reconciliation verification passed."
