param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  ".env.example",
  "apps/api/.env.example",
  "apps/api/README.md",
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "package.json",
  "packages/domain-hr/src/index.mjs",
  "packages/domain-hr/src/index.ts",
  "packages/db/migrations/20260321170000_phase7_hr_master.sql",
  "packages/db/seeds/20260321170010_phase7_hr_master_seed.sql",
  "packages/db/seeds/20260321171000_phase7_hr_master_demo_seed.sql",
  "tests/unit/hr-phase7-1.test.mjs",
  "tests/integration/phase7-hr-master-api.test.mjs",
  "tests/e2e/phase7-hr-master-flow.test.mjs",
  "docs/test-plans/master-test-strategy.md",
  "docs/prompts/CODEX_PROMPT_LIBRARY.md",
  "docs/runbooks/fas-7-hr-master-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 7.1 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 7.1 HR masterdata verification passed."
