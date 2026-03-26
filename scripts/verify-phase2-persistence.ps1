$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))

$requiredFiles = @(
  "packages/domain-core/src/repositories.mjs",
  "packages/domain-core/src/command-log.mjs",
  "packages/domain-core/src/jobs.mjs",
  "packages/domain-core/src/critical-domain-state-store.mjs",
  "apps/api/src/platform.mjs",
  "tests/unit/phase2-canonical-repositories.test.mjs",
  "tests/unit/phase2-command-log.test.mjs",
  "tests/unit/phase2-critical-domain-persistence.test.mjs",
  "tests/unit/phase14-async-jobs.test.mjs"
)

foreach ($path in $requiredFiles) {
  if (-not (Test-Path $path)) {
    throw "Required phase 2 persistence artifact missing: $path"
  }
}

node --test `
  "tests/unit/phase2-canonical-repositories.test.mjs" `
  "tests/unit/phase2-command-log.test.mjs" `
  "tests/unit/phase2-critical-domain-persistence.test.mjs" `
  "tests/unit/phase14-async-jobs.test.mjs"

Write-Host "Phase 2 persistence verification passed."
