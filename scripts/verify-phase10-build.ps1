param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  ".env.example",
  "apps/api/.env.example",
  "apps/api/README.md",
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "apps/field-mobile/README.md",
  "apps/field-mobile/src/server.mjs",
  "package.json",
  "packages/domain-hus/README.md",
  "packages/domain-hus/package.json",
  "packages/domain-hus/src/index.mjs",
  "packages/domain-hus/src/index.ts",
  "packages/domain-personalliggare/README.md",
  "packages/domain-personalliggare/package.json",
  "packages/domain-personalliggare/src/index.mjs",
  "packages/domain-personalliggare/src/index.ts",
  "packages/domain-projects/README.md",
  "packages/domain-projects/src/index.mjs",
  "packages/db/migrations/20260322040000_phase10_build_rules_hus_personalliggare.sql",
  "packages/db/seeds/20260322040010_phase10_build_rules_hus_personalliggare_seed.sql",
  "packages/db/seeds/20260322041000_phase10_build_rules_hus_personalliggare_demo_seed.sql",
  "tests/unit/hus-phase10-3.test.mjs",
  "tests/unit/personalliggare-phase10-3.test.mjs",
  "tests/unit/projects-phase10-3.test.mjs",
  "tests/integration/phase10-build-api.test.mjs",
  "tests/e2e/phase10-build-flow.test.mjs",
  "docs/MASTER_BUILD_PLAN.md",
  "docs/test-plans/master-verification-gates.md",
  "docs/test-plans/master-test-strategy.md",
  "docs/prompts/CODEX_PROMPT_LIBRARY.md",
  "docs/runbooks/fas-10-build-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 10.3 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 10.3 build verification passed."
