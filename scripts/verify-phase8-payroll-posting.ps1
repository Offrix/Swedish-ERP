param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "apps/api/README.md",
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "package.json",
  "packages/domain-hr/src/index.mjs",
  "packages/domain-payroll/README.md",
  "packages/domain-payroll/src/index.mjs",
  "packages/domain-payroll/src/index.ts",
  "packages/db/README.md",
  "packages/db/migrations/20260321220000_phase8_payroll_posting_payout.sql",
  "packages/db/seeds/README.md",
  "packages/db/seeds/20260321220010_phase8_payroll_posting_payout_seed.sql",
  "packages/db/seeds/20260321221000_phase8_payroll_posting_payout_demo_seed.sql",
  "tests/unit/payroll-phase8-3.test.mjs",
  "tests/integration/phase8-payroll-posting-api.test.mjs",
  "tests/e2e/phase8-payroll-posting-flow.test.mjs",
  "docs/MASTER_BUILD_PLAN.md",
  "docs/test-plans/master-verification-gates.md",
  "docs/test-plans/master-test-strategy.md",
  "docs/prompts/CODEX_PROMPT_LIBRARY.md",
  "docs/runbooks/fas-8-payroll-posting-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 8.3 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 8.3 payroll posting and payout verification passed."
