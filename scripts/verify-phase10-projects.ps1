param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  ".env.example",
  "apps/api/.env.example",
  "apps/api/README.md",
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "package.json",
  "packages/domain-projects/README.md",
  "packages/domain-projects/package.json",
  "packages/domain-projects/src/index.mjs",
  "packages/domain-projects/src/index.ts",
  "packages/domain-ar/src/index.mjs",
  "packages/domain-ar/src/index.ts",
  "packages/db/src/index.ts",
  "packages/db/migrations/20260322020000_phase10_projects_budget_followup.sql",
  "packages/db/seeds/20260322020010_phase10_projects_budget_followup_seed.sql",
  "packages/db/seeds/20260322021000_phase10_projects_budget_followup_demo_seed.sql",
  "tests/unit/projects-phase10-1.test.mjs",
  "tests/integration/phase10-projects-api.test.mjs",
  "tests/e2e/phase10-projects-flow.test.mjs",
  "docs/domain/projects-budget-wip-and-profitability.md",
  "docs/MASTER_BUILD_PLAN.md",
  "docs/test-plans/master-verification-gates.md",
  "docs/test-plans/master-test-strategy.md",
  "docs/prompts/CODEX_PROMPT_LIBRARY.md",
  "docs/runbooks/fas-10-projects-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 10.1 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 10.1 project verification passed."
