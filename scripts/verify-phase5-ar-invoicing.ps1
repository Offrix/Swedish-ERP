param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "packages/domain-ar/src/index.mjs",
  "packages/domain-ar/src/index.ts",
  "packages/domain-integrations/src/index.mjs",
  "packages/domain-integrations/src/index.ts",
  "packages/db/migrations/20260321120000_phase5_ar_invoicing_delivery.sql",
  "packages/db/seeds/20260321120010_phase5_ar_invoicing_delivery_seed.sql",
  "packages/db/seeds/20260321121000_phase5_ar_invoicing_delivery_demo_seed.sql",
  "tests/unit/ar-phase5-2.test.mjs",
  "tests/integration/phase5-ar-invoicing-api.test.mjs",
  "tests/e2e/phase5-ar-invoicing-flow.test.mjs",
  "docs/runbooks/fas-5-ar-invoicing-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 5.2 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 5.2 AR invoicing verification passed."
