param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "packages/domain-vat/src/index.mjs",
  "packages/domain-vat/src/index.ts",
  "packages/db/migrations/20260321100000_phase4_vat_reporting.sql",
  "packages/db/seeds/20260321100010_phase4_vat_reporting_seed.sql",
  "packages/db/seeds/20260321101000_phase4_vat_reporting_demo_seed.sql",
  "tests/unit/vat-phase4-3.test.mjs",
  "tests/integration/phase4-vat-reporting-api.test.mjs",
  "tests/e2e/phase4-vat-reporting-flow.test.mjs",
  "docs/runbooks/fas-4-vat-reporting-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 4.3 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 4.3 VAT reporting verification passed."
