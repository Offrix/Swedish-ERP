param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "packages/domain-core/src/index.mjs",
  "packages/domain-core/src/index.ts",
  "packages/db/migrations/20260322120000_phase11_bureau_portfolio.sql",
  "packages/db/seeds/20260322120010_phase11_bureau_portfolio_seed.sql",
  "packages/db/seeds/20260322121000_phase11_bureau_portfolio_demo_seed.sql",
  "tests/unit/core-phase11-2.test.mjs",
  "tests/integration/phase11-bureau-api.test.mjs",
  "tests/e2e/phase11-bureau-flow.test.mjs",
  "docs/runbooks/fas-11-bureau-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 11.2 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 11.2 bureau portfolio verification passed."
