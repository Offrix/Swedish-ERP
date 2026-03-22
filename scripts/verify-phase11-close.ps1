param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "packages/domain-core/src/index.mjs",
  "packages/domain-core/src/index.ts",
  "packages/domain-core/src/close.mjs",
  "packages/db/migrations/20260322130000_phase11_close_workbench.sql",
  "packages/db/seeds/20260322130010_phase11_close_workbench_seed.sql",
  "packages/db/seeds/20260322131000_phase11_close_workbench_demo_seed.sql",
  "tests/unit/core-phase11-3.test.mjs",
  "tests/integration/phase11-close-api.test.mjs",
  "tests/e2e/phase11-close-flow.test.mjs",
  "docs/runbooks/fas-11-close-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 11.3 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 11.3 close workbench verification passed."
