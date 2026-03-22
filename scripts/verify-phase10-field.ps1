param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  ".env.example",
  "apps/api/.env.example",
  "apps/api/README.md",
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "apps/field-mobile/README.md",
  "apps/field-mobile/src/server.mjs",
  "package.json",
  "packages/domain-field/README.md",
  "packages/domain-field/package.json",
  "packages/domain-field/src/index.mjs",
  "packages/domain-field/src/index.ts",
  "packages/ui-mobile/src/index.js",
  "packages/db/src/index.ts",
  "packages/db/migrations/20260322030000_phase10_field_work_orders_mobile_inventory.sql",
  "packages/db/seeds/20260322030010_phase10_field_work_orders_mobile_inventory_seed.sql",
  "packages/db/seeds/20260322031000_phase10_field_work_orders_mobile_inventory_demo_seed.sql",
  "tests/unit/field-phase10-2.test.mjs",
  "tests/integration/phase10-field-api.test.mjs",
  "tests/e2e/phase10-field-flow.test.mjs",
  "docs/domain/field-work-order-service-order-and-material-flow.md",
  "docs/MASTER_BUILD_PLAN.md",
  "docs/test-plans/master-verification-gates.md",
  "docs/test-plans/master-test-strategy.md",
  "docs/prompts/CODEX_PROMPT_LIBRARY.md",
  "docs/runbooks/fas-10-field-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 10.2 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 10.2 field verification passed."
