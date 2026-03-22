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
  "packages/domain-org-auth/src/index.mjs",
  "packages/domain-time/src/index.mjs",
  "packages/domain-time/src/index.ts",
  "packages/domain-time/README.md",
  "packages/db/migrations/20260321190000_phase7_absence_portal.sql",
  "packages/db/seeds/20260321190010_phase7_absence_portal_seed.sql",
  "packages/db/seeds/20260321191000_phase7_absence_portal_demo_seed.sql",
  "tests/unit/time-phase7-3.test.mjs",
  "tests/integration/phase7-absence-api.test.mjs",
  "tests/e2e/phase7-absence-flow.test.mjs",
  "docs/MASTER_BUILD_PLAN.md",
  "docs/test-plans/master-verification-gates.md",
  "docs/test-plans/master-test-strategy.md",
  "docs/prompts/CODEX_PROMPT_LIBRARY.md",
  "docs/runbooks/fas-7-absence-portal-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 7.3 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 7.3 absence and employee portal verification passed."
