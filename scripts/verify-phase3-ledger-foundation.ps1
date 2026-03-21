param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "apps/api/src/server.mjs",
  "packages/domain-ledger/src/index.mjs",
  "packages/domain-ledger/src/index.ts",
  "packages/db/migrations/20260321050000_phase3_ledger_foundation.sql",
  "packages/db/seeds/20260321050010_phase3_ledger_foundation_seed.sql",
  "packages/db/seeds/20260321051000_phase3_ledger_foundation_demo_seed.sql",
  "tests/unit/ledger-phase3.test.mjs",
  "tests/integration/phase3-ledger-api.test.mjs",
  "tests/e2e/phase3-ledger-flow.test.mjs",
  "docs/runbooks/fas-3-ledger-foundation-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 3.1 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 3.1 ledger foundation verification passed."
