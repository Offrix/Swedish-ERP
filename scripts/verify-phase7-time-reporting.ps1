param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  ".env.example",
  "apps/api/.env.example",
  "apps/api/README.md",
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "package.json",
  "packages/domain-time/src/index.mjs",
  "packages/domain-time/src/index.ts",
  "packages/db/migrations/20260321180000_phase7_time_reporting_schedules.sql",
  "packages/db/seeds/20260321180010_phase7_time_reporting_seed.sql",
  "packages/db/seeds/20260321181000_phase7_time_reporting_demo_seed.sql",
  "tests/unit/time-phase7-2.test.mjs",
  "tests/integration/phase7-time-api.test.mjs",
  "tests/e2e/phase7-time-flow.test.mjs",
  "docs/MASTER_BUILD_PLAN.md",
  "docs/test-plans/master-verification-gates.md",
  "docs/test-plans/master-test-strategy.md",
  "docs/prompts/CODEX_PROMPT_LIBRARY.md",
  "docs/runbooks/fas-7-time-reporting-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 7.2 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 7.2 time reporting verification passed."
