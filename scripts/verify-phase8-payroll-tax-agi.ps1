param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "apps/api/README.md",
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "package.json",
  "packages/domain-hr/src/index.mjs",
  "packages/domain-org-auth/src/index.mjs",
  "packages/domain-payroll/README.md",
  "packages/domain-payroll/src/index.mjs",
  "packages/domain-payroll/src/index.ts",
  "packages/db/migrations/20260321210000_phase8_payroll_tax_agi.sql",
  "packages/db/seeds/20260321210010_phase8_payroll_tax_agi_seed.sql",
  "packages/db/seeds/20260321211000_phase8_payroll_tax_agi_demo_seed.sql",
  "tests/unit/payroll-phase8-2.test.mjs",
  "tests/integration/phase8-payroll-tax-agi-api.test.mjs",
  "tests/e2e/phase8-payroll-tax-agi-flow.test.mjs",
  "docs/MASTER_BUILD_PLAN.md",
  "docs/test-plans/master-verification-gates.md",
  "docs/test-plans/master-test-strategy.md",
  "docs/prompts/CODEX_PROMPT_LIBRARY.md",
  "docs/runbooks/fas-8-payroll-tax-agi-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 8.2 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 8.2 payroll tax and AGI verification passed."
