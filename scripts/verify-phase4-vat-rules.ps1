param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "packages/domain-vat/src/index.mjs",
  "packages/domain-vat/src/index.ts",
  "packages/db/migrations/20260321090000_phase4_vat_rule_execution.sql",
  "packages/db/seeds/20260321090010_phase4_vat_rules_seed.sql",
  "packages/db/seeds/20260321091000_phase4_vat_rules_demo_seed.sql",
  "tests/unit/vat-phase4-2.test.mjs",
  "tests/integration/phase4-vat-rules-api.test.mjs",
  "tests/e2e/phase4-vat-rules-flow.test.mjs",
  "docs/runbooks/fas-4-vat-rules-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 4.2 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 4.2 VAT rules verification passed."
