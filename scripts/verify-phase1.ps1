param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "apps/desktop-web/src/server.mjs",
  "packages/auth-core/src/index.mjs",
  "packages/domain-org-auth/src/index.mjs",
  "packages/db/migrations/20260321010000_phase1_org_auth_onboarding.sql",
  "packages/db/seeds/20260321010010_phase1_seed.sql",
  "packages/db/seeds/20260321011000_phase1_demo_seed.sql",
  "tests/unit/auth-core-phase1.test.mjs",
  "tests/integration/phase1-org-auth-api.test.mjs",
  "tests/e2e/phase1-surface-flow.test.mjs",
  "docs/runbooks/fas-1-auth-onboarding-verification.md"
)

$missing = @()
foreach ($path in $requiredPaths) {
  if (-not (Test-Path $path)) {
    $missing += $path
  }
}

if ($missing.Count -gt 0) {
  Write-Error ("Missing Phase 1 paths:`n - " + ($missing -join "`n - "))
}

Write-Host "Phase 1 structure verification passed."
