$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))

$requiredFiles = @(
  "packages/domain-search/src/engine.mjs",
  "docs/runbooks/projection-rebuild.md",
  "docs/runbooks/search-index-rebuild-and-repair.md",
  "tests/unit/phase2-projection-rebuild.test.mjs",
  "tests/unit/phase33-search-contracts.test.mjs",
  "tests/integration/phase33-search-api.test.mjs"
)

foreach ($path in $requiredFiles) {
  if (-not (Test-Path $path)) {
    throw "Required phase 2 projection artifact missing: $path"
  }
}

node --test `
  "tests/unit/phase2-projection-rebuild.test.mjs" `
  "tests/unit/phase33-search-contracts.test.mjs" `
  "tests/integration/phase33-search-api.test.mjs"

Write-Host "Phase 2 projection rebuild verification passed."
