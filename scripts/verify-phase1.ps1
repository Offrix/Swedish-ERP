param()

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "apps/api/src/platform.mjs",
  "apps/api/src/server.mjs",
  "apps/desktop-web/src/server.mjs",
  "apps/field-mobile/src/server.mjs",
  "apps/worker/src/worker.mjs",
  "scripts/lib/runtime-mode.mjs",
  "scripts/lib/runtime-diagnostics.mjs",
  "scripts/repair-migration-history.mjs",
  "scripts/runtime-honesty-scan.mjs",
  "packages/domain-ledger/src/account-catalog.mjs",
  "packages/domain-ledger/src/data/dsam-2026.catalog.json",
  "tests/unit/phase1-value-kernel.test.mjs",
  "tests/unit/phase1-clone-api.test.mjs",
  "tests/unit/phase1-account-catalog.test.mjs",
  "tests/unit/phase1-migration-history.test.mjs",
  "tests/unit/phase1-migration-history-repair.test.mjs",
  "tests/unit/phase1-runtime-mode.test.mjs",
  "tests/unit/phase1-bootstrap-mode.test.mjs",
  "tests/unit/phase1-runtime-capability-truth.test.mjs",
  "tests/unit/phase1-protected-runtime-route-guards.test.mjs",
  "tests/unit/phase1-startup-diagnostics.test.mjs",
  "tests/unit/phase1-runtime-honesty-scan-cli.test.mjs",
  "tests/integration/phase1-runtime-diagnostics-api.test.mjs",
  "tests/e2e/apps-smoke.test.mjs",
  "docs/runbooks/account-catalog-update.md",
  "docs/runbooks/migration-history-repair.md",
  "docs/runbooks/runtime-mode-validation.md"
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

& node "scripts/runtime-honesty-scan.mjs" `
  --mode "production" `
  --surface "api" `
  --active-store-kind "memory" `
  --critical-domain-state-store-kind "memory" `
  --expect-finding "missing_persistent_store" `
  --expect-finding "map_only_critical_truth" `
  --expect-finding "stub_provider_present" `
  --require-startup-blocked `
  --require-blocking `
  --json

if ($LASTEXITCODE -ne 0) {
  Write-Error "Phase 1 honesty scan failed for protected runtime."
}

& node "scripts/runtime-honesty-scan.mjs" `
  --mode "production" `
  --surface "api" `
  --active-store-kind "memory" `
  --critical-domain-state-store-kind "memory" `
  --bootstrap-mode "scenario_seed" `
  --bootstrap-scenario-code "phase1_protected_seed_probe" `
  --seed-demo `
  --expect-finding "seed_demo_forbidden" `
  --expect-finding "demo_data_present_in_protected_mode" `
  --require-startup-blocked `
  --require-blocking `
  --json

if ($LASTEXITCODE -ne 0) {
  Write-Error "Phase 1 protected boot scan did not flag forbidden seeding."
}

& node --test `
  "tests/unit/phase1-value-kernel.test.mjs" `
  "tests/unit/phase1-clone-api.test.mjs" `
  "tests/unit/phase1-account-catalog.test.mjs" `
  "tests/unit/phase1-migration-history.test.mjs" `
  "tests/unit/phase1-migration-history-repair.test.mjs" `
  "tests/unit/phase1-runtime-mode.test.mjs" `
  "tests/unit/phase1-bootstrap-mode.test.mjs" `
  "tests/unit/phase1-runtime-capability-truth.test.mjs" `
  "tests/unit/phase1-protected-runtime-route-guards.test.mjs" `
  "tests/unit/phase1-startup-diagnostics.test.mjs" `
  "tests/unit/phase1-runtime-honesty-scan-cli.test.mjs" `
  "tests/integration/phase1-runtime-diagnostics-api.test.mjs" `
  "tests/e2e/apps-smoke.test.mjs"

if ($LASTEXITCODE -ne 0) {
  Write-Error "Phase 1 verification failed."
}

Write-Host "Phase 1 verification passed."
