param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "packages/domain-ap/src/index.mjs",
  "packages/domain-ap/src/index.ts",
  "packages/db/migrations/20260321140000_phase6_ap_masterdata_po_receipts.sql",
  "packages/db/seeds/20260321140010_phase6_ap_masterdata_po_receipts_seed.sql",
  "packages/db/seeds/20260321141000_phase6_ap_masterdata_po_receipts_demo_seed.sql",
  "tests/unit/ap-phase6-1.test.mjs",
  "tests/integration/phase6-ap-masterdata-api.test.mjs",
  "tests/e2e/phase6-ap-masterdata-flow.test.mjs",
  "docs/runbooks/fas-6-ap-masterdata-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 6.1 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 6.1 AP masterdata verification passed."
