param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "packages/domain-vat/src/index.mjs",
  "packages/domain-vat/src/index.ts",
  "packages/rule-engine/src/index.mjs",
  "packages/rule-engine/src/index.ts",
  "packages/db/migrations/20260321080000_phase4_vat_masterdata_rulepacks.sql",
  "packages/db/seeds/20260321080010_phase4_vat_masterdata_seed.sql",
  "packages/db/seeds/20260321081000_phase4_vat_masterdata_demo_seed.sql",
  "tests/unit/vat-phase4-1.test.mjs",
  "tests/integration/phase4-vat-api.test.mjs",
  "tests/e2e/phase4-vat-flow.test.mjs",
  "docs/runbooks/fas-4-vat-masterdata-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 4.1 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 4.1 VAT masterdata and decision verification passed."
