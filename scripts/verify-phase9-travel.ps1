param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  ".env.example",
  "apps/api/.env.example",
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "package.json",
  "packages/domain-travel/README.md",
  "packages/domain-travel/package.json",
  "packages/domain-travel/src/index.mjs",
  "packages/domain-travel/src/index.ts",
  "packages/domain-travel/src/normal-amounts-2026.mjs",
  "packages/domain-payroll/src/index.mjs",
  "packages/db/migrations/20260322000000_phase9_travel_expenses.sql",
  "packages/db/seeds/20260322000010_phase9_travel_expenses_seed.sql",
  "packages/db/seeds/20260322001000_phase9_travel_expenses_demo_seed.sql",
  "tests/unit/travel-phase9-2.test.mjs",
  "tests/integration/phase9-travel-api.test.mjs",
  "tests/e2e/phase9-travel-flow.test.mjs",
  "docs/MASTER_BUILD_PLAN.md",
  "docs/test-plans/master-verification-gates.md",
  "docs/test-plans/master-test-strategy.md",
  "docs/prompts/CODEX_PROMPT_LIBRARY.md",
  "docs/runbooks/fas-9-travel-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 9.2 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 9.2 travel verification passed."
