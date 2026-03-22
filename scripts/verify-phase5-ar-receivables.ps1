param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "packages/domain-ar/src/index.mjs",
  "packages/domain-ar/src/index.ts",
  "packages/db/migrations/20260321130000_phase5_ar_receivables_dunning_matching.sql",
  "packages/db/seeds/20260321130010_phase5_ar_receivables_dunning_matching_seed.sql",
  "packages/db/seeds/20260321131000_phase5_ar_receivables_dunning_matching_demo_seed.sql",
  "tests/unit/ar-phase5-3.test.mjs",
  "tests/integration/phase5-ar-receivables-api.test.mjs",
  "tests/e2e/phase5-ar-receivables-flow.test.mjs",
  "docs/runbooks/fas-5-ar-receivables-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 5.3 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 5.3 AR receivables verification passed."
