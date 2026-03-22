param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "packages/document-engine/src/index.mjs",
  "packages/domain-ap/src/index.mjs",
  "packages/domain-ap/src/index.ts",
  "packages/db/migrations/20260321150000_phase6_ap_invoice_ingest_matching.sql",
  "packages/db/seeds/20260321150010_phase6_ap_invoice_ingest_matching_seed.sql",
  "packages/db/seeds/20260321151000_phase6_ap_invoice_ingest_matching_demo_seed.sql",
  "tests/unit/ap-phase6-2.test.mjs",
  "tests/integration/phase6-ap-invoice-matching-api.test.mjs",
  "tests/e2e/phase6-ap-invoice-matching-flow.test.mjs",
  "docs/runbooks/fas-6-ap-invoice-matching-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 6.2 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 6.2 AP invoice ingest and matching verification passed."
