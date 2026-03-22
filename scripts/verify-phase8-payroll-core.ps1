param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  ".env.example",
  "apps/api/.env.example",
  "apps/api/README.md",
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "package.json",
  "packages/domain-payroll/README.md",
  "packages/domain-payroll/src/index.mjs",
  "packages/domain-payroll/src/index.ts",
  "packages/db/migrations/20260321200000_phase8_payroll_core.sql",
  "packages/db/seeds/20260321200010_phase8_payroll_core_seed.sql",
  "packages/db/seeds/20260321201000_phase8_payroll_core_demo_seed.sql",
  "tests/unit/payroll-phase8-1.test.mjs",
  "tests/integration/phase8-payroll-api.test.mjs",
  "tests/e2e/phase8-payroll-flow.test.mjs",
  "docs/MASTER_BUILD_PLAN.md",
  "docs/test-plans/master-verification-gates.md",
  "docs/test-plans/master-test-strategy.md",
  "docs/prompts/CODEX_PROMPT_LIBRARY.md",
  "docs/runbooks/fas-8-payroll-core-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 8.1 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 8.1 payroll core verification passed."
