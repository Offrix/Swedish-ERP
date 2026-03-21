param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "apps/api/src/server.mjs",
  "packages/domain-ledger/src/index.mjs",
  "packages/domain-ledger/src/index.ts",
  "packages/db/migrations/20260321060000_phase3_ledger_dimensions_locks.sql",
  "packages/db/seeds/20260321060010_phase3_ledger_dimensions_locks_seed.sql",
  "packages/db/seeds/20260321061000_phase3_ledger_dimensions_locks_demo_seed.sql",
  "tests/unit/ledger-phase3-2.test.mjs",
  "tests/integration/phase3-ledger-rules-api.test.mjs",
  "tests/e2e/phase3-ledger-rules-flow.test.mjs",
  "docs/runbooks/fas-3-ledger-rules-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 3.2 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 3.2 ledger rules verification passed."
