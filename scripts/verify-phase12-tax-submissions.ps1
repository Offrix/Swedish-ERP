param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "packages/domain-annual-reporting/src/index.mjs",
  "packages/domain-annual-reporting/src/index.ts",
  "packages/domain-integrations/src/index.mjs",
  "packages/domain-integrations/src/index.ts",
  "packages/db/migrations/20260322150000_phase12_tax_submission_engine.sql",
  "packages/db/seeds/20260322150010_phase12_tax_submission_seed.sql",
  "packages/db/seeds/20260322151000_phase12_tax_submission_demo_seed.sql",
  "tests/unit/annual-reporting-phase12-2.test.mjs",
  "tests/integration/phase12-tax-submission-api.test.mjs",
  "tests/e2e/phase12-tax-submission-flow.test.mjs",
  "docs/runbooks/fas-12-tax-submission-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 12.2 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 12.2 tax submission verification passed."
