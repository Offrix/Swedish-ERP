param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  ".env.example",
  "apps/api/.env.example",
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "package.json",
  "packages/domain-benefits/README.md",
  "packages/domain-benefits/package.json",
  "packages/domain-benefits/src/index.mjs",
  "packages/domain-benefits/src/index.ts",
  "packages/domain-payroll/src/index.mjs",
  "packages/db/migrations/20260321230000_phase9_benefits_engine.sql",
  "packages/db/seeds/20260321230010_phase9_benefits_engine_seed.sql",
  "packages/db/seeds/20260321231000_phase9_benefits_engine_demo_seed.sql",
  "tests/unit/benefits-phase9-1.test.mjs",
  "tests/integration/phase9-benefits-api.test.mjs",
  "tests/e2e/phase9-benefits-flow.test.mjs",
  "docs/MASTER_BUILD_PLAN.md",
  "docs/test-plans/master-verification-gates.md",
  "docs/test-plans/master-test-strategy.md",
  "docs/prompts/CODEX_PROMPT_LIBRARY.md",
  "docs/runbooks/fas-9-benefits-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 9.1 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 9.1 benefits verification passed."
