param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "packages/auth-core/src/index.mjs",
  "packages/domain-ap/src/index.mjs",
  "packages/domain-ap/src/index.ts",
  "packages/domain-banking/src/index.mjs",
  "packages/domain-banking/src/index.ts",
  "packages/db/migrations/20260321160000_phase6_ap_attest_payments.sql",
  "packages/db/seeds/20260321160010_phase6_ap_attest_payments_seed.sql",
  "packages/db/seeds/20260321161000_phase6_ap_attest_payments_demo_seed.sql",
  "tests/unit/ap-phase6-3.test.mjs",
  "tests/integration/phase6-ap-payments-api.test.mjs",
  "tests/e2e/phase6-ap-payments-flow.test.mjs",
  "docs/runbooks/fas-6-ap-payments-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 6.3 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 6.3 AP attest, payments and returns verification passed."
