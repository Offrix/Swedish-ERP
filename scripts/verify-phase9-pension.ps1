param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  ".env.example",
  "apps/api/.env.example",
  "apps/api/README.md",
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "package.json",
  "packages/domain-pension/README.md",
  "packages/domain-pension/package.json",
  "packages/domain-pension/src/index.mjs",
  "packages/domain-pension/src/index.ts",
  "packages/domain-payroll/src/index.mjs",
  "packages/db/migrations/20260322010000_phase9_pension_salary_exchange.sql",
  "packages/db/seeds/20260322010010_phase9_pension_salary_exchange_seed.sql",
  "packages/db/seeds/20260322011000_phase9_pension_salary_exchange_demo_seed.sql",
  "tests/unit/pension-phase9-3.test.mjs",
  "tests/integration/phase9-pension-api.test.mjs",
  "tests/e2e/phase9-pension-flow.test.mjs",
  "docs/MASTER_BUILD_PLAN.md",
  "docs/test-plans/master-verification-gates.md",
  "docs/test-plans/master-test-strategy.md",
  "docs/prompts/CODEX_PROMPT_LIBRARY.md",
  "docs/runbooks/fas-9-pension-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 9.3 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 9.3 pension verification passed."
